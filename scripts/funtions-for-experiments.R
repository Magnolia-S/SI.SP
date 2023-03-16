formatData <- function(.data, experiment) {
  require(tidyverse)
  require(assertthat)
  require(lubridate)
  
  assert_that(
    experiment %in% c("PRATTLIM"), ## is this the same for me?
    msg = "It looks like you're trying to process a new experiment. First edit formatData to accommodate that experiment.")
    
  .data %<>%
        rename( 
               assignmentid = experiment_id,
               ParticipantID = workerid) %>%
    
    
### Check this section!!
------------------------------ 
    # Separate the practice, exposure, and test columns into one column per trial
    # (each with one more parts then there are trials because the last element is also followed by a ";". 
    # This last empty element should then be removed. If you get a warning, however, that means that 
    # at least one participant has more trials than expected)
     { if ("practice//Resp" %in% names(.))     
        separate(., 
                 practiceResp,
                 # Practice Trial = unlimted, should be no more than 4
                 # Unused trials are discarded below
                 into = paste0("Practice.Trial_", 1:10),
                 sep = ";",
                 fill = "right") 
       else . } %>%
    { if ("exposure//Resp" %in% names(.)) # <--- This needs to change so that it gets ALL exposure blocks ("exposure1Resp", etc.)
      separate(.,
               exposureResp,
               # Exposure Trials = 80
               # Unused trials are discarded below
               into = paste0("Exposure_Trial.", 1:80),
               sep = ";",
               fill = "right") 
      else . } %>%
    { if ("test//Resp" %in% names(.)) # <--- This needs to change so that it gets ALL test blocks ("test20Resp", etc.)
    separate(.,
      testResp,
      into = paste0("Test_Trial.", 1:72),
      sep = ";") else . } %>%
    pivot_longer(
      cols = contains("_Trial"), 
      names_to = c("Phase", "Trial"),
      names_pattern = "(.*)_Trial(.*)"
    ) %>%
    
    # Remove empty final trial from each phase, as well as all unused practice trials (which are NA)
    filter(value != "" & !is.na(value)) %>%
    
    # Separate *trial-level* information into multiple columns
    separate(
      value,
      into = c("Block_Number",
               "Trial.Order",
               "Stimulus",            ## Seems stimuli were given a number in the block
               
               "Filename",
                  "Trial.Type",       ## Critical, Filler, Test
               
                  # I think I'll need to separate the file names into Talker.A and Talker.B
                  # based on the ear (order in the file name), then mutate = Attended.Talker
                  # based on Talker.X_Gender; TALKER.A and TALKER.B are PLACEHOLDERS
                  
                  "Talker.A_Label",   ## Critical: S/As, Sh/Ash; Filler: N/W
                  "Talker.A_Shift",   ## only for Critical
                  "Talker.A_Sound",
                  "Talker.A_Ear",     ## Always L 
                                                      ### NO Talker.B FOR TEST
                  "Talker.B_Label",
                  "Talker.B_Shift",   ## only for Critical
                  "Talker.B_Sound",
                  "Talker.B_Ear", 
                
               # (Not in file name)
                # "Attended.Talker",  ## Attended.Talker Gender = L for Critical
                # "Correct.resp",     ## defined by Talker.A_Gender + Attended.Talker 
               
                  "Resp.Key",         ## 77 vs 88; also have participant answer
                  "Response",         ## Participant reported Word/Nonword
              
                 # 3 numbers that I think have to do with trial duration 
               
                  "#1",               ## start
                  "#2",               ## end
                  "#3",               ## elapsed (units = ms?)
               
                 # the word "false"; not sure in response to what
                  "false"
               ),
      
            sep = ",") %>%
------------------------------
    
    # Add Experiment information
    mutate(Experiment = experiment) %>%
    
    # Renaming
    dplyr::rename(
      Experiment.Protocol = rsrb.protocol,
      AssignmentID = assignmentid,
      Assignment.Comment = comments) %>%
    rename_at(
      vars(starts_with("rsrb")), 
      ~ gsub("rsrb\\.([a-z])", "Participant\\.\\U\\1", .x, perl = T)) %>%
   
    # Make Trial numerical
    mutate(Trial = as.numeric(Trial)) %>%
  

### Check this section!!
------------------------------
    # Create block variable (1-10 for exposure, 1-12 for test) 
      ## My trial-level data is already grouped by block?
    
    group_by(Phase) %>% 
    mutate(
      Phase = factor(tolower(Phase), levels = levels.Phase),
      Block = if (first(Phase) == "practice") 1 else 
        cut(Trial, if (first(Phase) == "exposure") 8 else 6, labels = FALSE)) %>% # 8 and 6 should be replaced by the number of trials in each block of exposure and test, respectively
    ungroup() %>%
    mutate(
      
    # Extract item information <- this is original
      REMOVE.Item = ifelse(
        grepl("\\-occluder", Item.Filename),
        gsub("^(.*)\\-occluder\\.(webm|mp4)$", "\\1", Item.Filename),
        gsub("^(.*)\\.(webm|mp4)$", "\\1", Item.Filename)),
      # All of the stuff below this line needs to be adjusted to parse your filename into info about this trial/item
    
    # My edits
      # remove .wav from the file name
        Item = gsub("*.wav$", "", Item.Filename),
     
      # Item types
        
        # Critical
        Critical.Item = grepl("^Critical_\\.csv", Item.Filename)
        
        # Filler
        Filler.Item = grepl("^Filler_\\.csv", Item.Filename)
          ifelse(Filler.Item grepl("W", Item), "mouth", "hand"),
        
        # Test
        Test.Item = grepl("^Test_\\.csv", Item.Filename)
      
      Item.Type = ifelse(Phase == "test", "test", gsub("^([A-Z]+)[0-9]+.*$", "\\1", REMOVE.Item)),
      
      CHECK.Item.Label = case_when(
        Item.Type == "As" ~ "S",
        Item.Type == "Ash" ~ "Sh", 
        T ~ NA_character_),
      Item.WordStatus = ifelse(Item.Type %in% c("Critical", "filler"), "non-word", "word"),
      Item.Type = case_when(
        Item.Type %in% c("W", "N") ~ "filler",
        
        Item.Type %in% c("S", "sh") ~ "typical",
        Item.Type %in% c("As", "Ash") ~ "shifted",
        T ~ Item.Type),
      
      ItemID = ifelse(Phase == "test", 
                      gsub("^.*(Frame[0-9]+)\\-.*$", "\\1", REMOVE.Item), 
                      gsub("^A?([A-Z]+[0-9]+)[A-Z].*$", "\\1", REMOVE.Item)),
      Task = case_when(
        Task %in% c("lexicaldecision", "exposure") ~ "lexical decision",
        Task %in% c("pract", "practice") ~ "lexical decision",
        Task == "test" ~ "identification",
        T ~ NA_character_
      )) %>%
------------------------------ 
    
    # Get key character based on Gevher's reading of the JS code (labelingBlock.js)
                      # (and make sure that "B" responses lead to NAs in the Response variable)
                      mutate(
                        Response = ifelse(Response == "NO RESPONSE PROVIDED", NA, Response),
                        Response.Keycode.Character = case_when(
                          Response.Keycode == "77" ~ "M",
                          Response.Keycode == "88" ~ "X",
                          T ~ NA_character_),

                          
### Check this section!!
------------------------------                  
                         Response.CorrectWordStatus = case_when(
                           
                           item.type == "Critical" 
                           ~ "word"
                           
                           item.type == "Filler" &
                           "Attended.Talker_Gender" == M
                           ~ 
                          
                          
                          Phase == "test" ~ NA_real_ %>%
              
                          as.character(Response) == as.character(Item.WordStatus) ~ 1,
                          as.character(Response) != as.character(Item.WordStatus) ~ 0,
                          T ~ NA_real_)) %>%
------------------------------                 
    
                     # Add time information based on assignment submit time
                        { if ("userDateTimeOffset" %in% names(.)) 
                          dplyr::rename(., Assignment.Submit.DateTime.UserLocalTime.OffsetFromUTC = userDateTimeOffset) else 
                            mutate(., Assignment.Submit.DateTime.UserLocalTime.OffsetFromUTC = NA) } %>%
                        { if ("us.timezone" %in% names(.)) 
                          dplyr::rename(., Assignment.Submit.US_TimeZone = us.timezone) else 
                            mutate(., Assignment.Submit.US_TimeZone = NA) } %>%
                        { if ("Assignment.Submit.DateTime.UTC" %in% names(.)) 
                          mutate(.,
                                 Assignment.Submit.DateTime.UserLocalTime = Assignment.Submit.DateTime.UTC - minutes(Assignment.Submit.DateTime.UserLocalTime.OffsetFromUTC),
                                 Assignment.Submit.DuringDayTime = ifelse(between(hour(Assignment.Submit.DateTime.UserLocalTime), 7, 21), T, F)) %>%
                      
                       # Get durational measures (in minutes)
                            group_by(ParticipantID) %>%
                            mutate(
                              Duration.Assignment = difftime(Assignment.Submit.DateTime.UTC, Assignment.Accept.DateTime.UTC, units = "mins")) %>%
                            ungroup()
                          else . } %>%
                        
                        # Variable typing
                        mutate_at(vars(Response.Keycode, Time.StartOfStimulus, Time.EndOfTrial, Response.RT),
                                  as.numeric) %>%
                        mutate_at(vars(ParticipantID, Phase, starts_with("Condition"), starts_with("Item"),
                                       Response, Response.Keycode.Character, Task,
                                       AssignmentID),
                                  factor) %>%
                        mutate(
                          
                          # Make factor levels
                          ItemID = # fill in,
                            Item.Type = factor(Item.Type, levels = levels.Item.Type),
                          Participant.Sex = factor(Participant.Sex, levels.Sex),
                          Participant.Race = factor(
                            plyr::mapvalues(
                              simplifyAnswer(Participant.Race), 
                              c("amerind", "asian", "black", "multiple", "other", "white"),
                              c("American Indican", "Asian", "Black", "multiple", "other", "White")), 
                            levels.Race),
                          Participant.Ethnicity = factor(
                            plyr::mapvalues(
                              simplifyAnswer(Participant.Ethnicity),
                              c("Hisp", "NonHisp"),
                              c("Hispanic", "Non-Hispanic")),
                            levels.Ethnicity)) %>%
                        group_by(ParticipantID) %>%
                        mutate(
                          Duration.AllPhases = (max(Time.EndOfTrial) - min(Time.StartOfStimulus)) / 60000) %>%
                        ungroup() %>%
                    
                     # Remove unnecessary columns and order remaining columns
                        select(
                          -starts_with("CHECK"),
                          -starts_with("REMOVE")) %>%
                        arrange(Experiment, ParticipantID, Phase, Block, Trial) %>%
                        sortVars()
                      
                      return(.data)
}

