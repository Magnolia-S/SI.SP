formatData <- function(.data, experiment) {
  require(tidyverse)
  require(assertthat)
  require(lubridate)
  
  assert_that(
    experiment %in% c("experiment.a"), ## is this the same for me?
    msg = "It looks like you're trying to process a new experiment. First edit formatData to accommodate that experiment.")
  
  .data %<>%
    rename( 
      assignmentid = experiment_id,
      ParticipantID = workerid) %>%
    
    
    # Sorting trial-level data into own columns
    # ------------------------------ 
  # Separate the practice, exposure, and test columns into one column per trial
  # (each with one more parts then there are trials because the last element is also followed by a ";". 
  # This last empty element should then be removed. If you get a warning, however, that means that 
  # at least one participant has more trials than expected)
  { if ("practiceResp" %in% names(.))
    separate_wider_delim(.,
                         practiceResp,
                         names = paste0("Practice_Trial.", 1:24),
                         delim = ";",
                         too_few = "align_start")
    else . } %>% 
    { if (any(grepl("exposure\\d{1,2}Resp", names(.)))) 
      separate_wider_delim(., 
                           cols = matches("exposure\\d{1,2}Resp"),
                           names = paste0("Exposure_Trial.", 1:9),
                           names_repair = "universal",
                           delim = ";",
                           too_few = "error",
                           too_many = "error")
      else . } %>% 
    { if (any(grepl("test\\d{2}Resp", names(.)))) 
      separate_wider_delim(., 
                           cols = matches("test\\d{2}Resp"),
                           names = paste0("Test_Trial.", 1:7),
                           names_repair = "universal",
                           delim = ";",
                           too_few = "error",
                           too_many = "error") 
      else . } %>% 
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
      into = c("Block",
               "TrialOrder",
               "Stimulus",            ## Seems stimuli were given a number in the block
               "Filename",
               "Response.Key",       ## 88 or 77
               "Response",   ## Word or Non-Word
               "Time.StartOfStimulus",   ## start time
               "Time.EndOfTrial",      ## end time
               "Time.ResponseRT",     ## difference between start of stimulus and end of trial
               "Blank_col", ## temporary name
               "Feedback"),  ##response feedback always false
      sep = ",") %>% 
    mutate(Block = as.numeric((str_replace(Block,"^([a-z]*)(\\d{1,2}$)", "\\2"))),
           Experiment = experiment) %>%  
   mutate(Block = case_when(
     Phase == "Practice" ~ 1,
     Phase == "Exposure" ~ (Block + 1),
     Phase == "Test" ~ (Block + 1),
     T ~ NA
   )) %>%
    mutate(TrialOrder = as.numeric((str_replace(TrialOrder, ".(\\d{1,2})...\\d{1,2}$", "\\1"))),
           Experiment = experiment) %>% 
    mutate(Trial = (TrialOrder + 1)) %>% 
    mutate(Trial = case_when(
      Phase == "Practice" ~ 0,
      Phase == "Exposure" ~ (((Block - 2) * 8) + Trial),
      Phase == "Test" ~ (((Block - 12) * 6) + 80 + Trial),
      T ~ NA
    )) %>%
    dplyr::rename(
      Experiment.Protocol = rsrb.protocol,
      AssignmentID = assignmentid,
      Assignment.Comment = comments) %>%
    rename_at(
      vars(starts_with("rsrb")), 
      ~ gsub("rsrb\\.([a-z])", "Participant\\.\\U\\1", .x, perl = T)) %>%
    
   mutate(Filename = case_when(Filename == "Filler_W.Heroine.F.L_M.Neramgory.M.R.wav" ~ gsub("M.N", "N.N", Filename), T ~ Filename)) %>%
    
    # Item.Type = Critical/Filler/Test
    mutate(Item.Type = case_when(Response == "word" | Response == "non-word" ~ str_replace(Filename, "(.*)_.*_.*\\.wav$", "\\1"),
                                 Response == "ASI" | Response == "ASHI" ~ str_replace(Filename, "(.*)_.*\\.wav$", "\\1")),
           Talker.L = case_when(Item.Type == "Critical" | Item.Type == "Filler" ~ str_replace(Filename, ".*_(.*)_.*\\.wav$", "\\1"),
                                Item.Type != "Critical" | Item.Type != "Filler" ~ NA),
           Talker.R = case_when(Item.Type == "Critical" | Item.Type == "Filler" ~ str_replace(Filename, ".*_.*_(.*)\\.wav$", "\\1"),
                                Item.Type != "Critical" | Item.Type != "Filler" ~ NA),
           Talker.Test = ifelse(Item.Type == "Test", str_replace(Filename, ".*_(.*)\\.wav$", "\\1"), NA),
           
           # Left Talker
           Talker.L_Label = str_replace(Talker.L, "(.*)\\..*\\..*\\.L", "\\1"),
           Talker.L_Item.Version = case_when(Talker.L_Label == "As" | Talker.L_Label == "Ash" ~ "Shifted",
                                             Talker.L_Label == "S" | Talker.L_Label == "Sh" ~ "Unshifted",
                                             T ~ NA),
           Talker.L_Item.Sound = case_when(Talker.L_Label == "S" | Talker.L_Label == "As" ~ "S", 
                                           Talker.L_Label == "Sh" | Talker.L_Label == "Ash" ~ "Sh",
                                           Talker.L_Label == "W" ~ "Word",
                                           Talker.L_Label == "N" ~ "Nonword",
                                           T ~ "NA"),
           Talker.L_Item = str_replace(Talker.L, ".*\\.(.*)\\..*.L", "\\1"),
           Talker.L_Gender = str_replace(Talker.L, ".*\\..*\\.(.*).L", "\\1"),
           Talker.L_Gender = case_when(Talker.L_Gender == "M" ~ "Male", Talker.L_Gender == "F" ~ "Female"),
           
           
           # Right Talker
           Talker.R_Label = str_replace(Talker.R, "(.*)\\..*\\..*.R", "\\1"),
           Talker.R_Item.Version = case_when(Talker.R_Label == "As" | Talker.R_Label == "Ash" ~ "Shifted",
                                             Talker.R_Label == "S" | Talker.R_Label == "Sh" ~ "Unshifted",
                                             T ~ NA),
           Talker.R_Item.Sound = case_when(Talker.R_Label == "S" | Talker.R_Label == "As" ~ "S", 
                                           Talker.R_Label == "Sh" | Talker.R_Label == "Ash" ~ "Sh",
                                           Talker.R_Label == "W" ~ "Word",
                                           Talker.R_Label == "N" ~ "Nonword",
                                           T ~ "NA"),
           Talker.R_Item = str_replace(Talker.R, ".*\\.(.*)\\..*.R", "\\1"),
           Talker.R_Gender = str_replace(Talker.R, ".*\\..*\\.(.*).R", "\\1"),
           Talker.R_Gender = case_when(Talker.R_Gender == "M" ~ "Male",Talker.R_Gender == "F" ~ "Female"),
           
           # Test Talker
           Talker.Test_Gender = str_replace(Talker.Test, "^(.*)\\.ashi\\.\\d{2}$", "\\1"),
           Talker.Test_Item = str_replace(Talker.Test, "^.*\\.(ashi\\.\\d{2})$", "\\1"),
           
           # Attended Talker
           Attended.Talker = case_when(Talker.Test_Gender == "M" ~ "Male",
                                       Talker.Test_Gender == "F" ~ "Female",
                                       AttendedTalkerGender == "M" & Talker.L_Gender == "Male" ~ "Talker.L",
                                       AttendedTalkerGender == "F" & Talker.L_Gender == "Female" ~ "Talker.L",
                                       T ~ "Talker.R"),
           # Attended Version
           Attended.Talker_Version = case_when(Attended.Talker == "Talker.L" ~ Talker.L_Item.Version, 
                                               Attended.Talker == "Talker.R" ~ Talker.R_Item.Version,
                                               T ~ "NA"),
           # Attended Sound
           Attended.Talker_Sound = case_when(Attended.Talker == "Talker.L" ~ Talker.L_Item.Sound, 
                                             Attended.Talker == "Talker.R" ~ Talker.R_Item.Sound,
                                             T ~ "NA"),
           # Attended Item 
           Attended.Talker_Item = case_when(Attended.Talker == "Talker.L" ~ Talker.L_Item,
                                            Attended.Talker == "Talker.R" ~ Talker.R_Item,
                                            Phase == "Test" ~ Talker.Test_Item,
                                            T ~ "NA"),
           # Attended Gender
           Attended.Talker_Gender =  case_when(Phase == "Test" & Talker.Test_Gender == "M" ~ "Male",
                                               Phase == "Test" & Talker.Test_Gender == "F" ~ "Female",
                                               Attended.Talker == "Talker.L" ~ Talker.L_Gender, 
                                               Attended.Talker == "Talker.R" ~ Talker.R_Gender,
                                               T ~ "NA"), 
           # Attended Ear
           Attended.Talker_Ear = case_when(Attended.Talker == "Talker.L" ~ "Left", 
                                           Attended.Talker == "Talker.R" ~ "Right", 
                                           T ~ "NA"), 
           
           # Unattended Talker
           Unattended.Talker = case_when(AttendedTalkerGender == "M" & Talker.L_Gender == "Male" ~ "Talker.R",
                                         AttendedTalkerGender == "F" & Talker.L_Gender == "Female" ~ "Talker.R",
                                         AttendedTalkerGender == "M" & Talker.L_Gender == "Female" ~ "Talker.L",
                                         AttendedTalkerGender == "F" & Talker.L_Gender == "Male" ~ "Talker.L",
                                         T ~ "NA"), 
           # Unattended Version
           Unattended.Talker_Version = case_when(Attended.Talker == "Talker.L" ~ Talker.R_Item.Version, 
                                                 Attended.Talker == "Talker.R" ~ Talker.L_Item.Version,
                                                 T ~ "NA"),
           # Unattended Sound
           Unattended.Talker_Sound = case_when(Attended.Talker == "Talker.L" ~ Talker.R_Item.Sound, 
                                               Attended.Talker == "Talker.R" ~ Talker.L_Item.Sound,
                                               T ~ "NA"),
           # Unattended Item 
           Unattended.Talker_Item = case_when(Attended.Talker == "Talker.L" ~ Talker.R_Item, 
                                              Attended.Talker == "Talker.R" ~ Talker.L_Item,
                                              T ~ "NA"), 
           # Unattended Gender
           Unattended.Talker_Gender = case_when(Attended.Talker == "Talker.L" ~ Talker.R_Gender, 
                                                Attended.Talker == "Talker.R" ~ Talker.L_Gender,
                                                T ~ "NA"),
           # Unattended Ear
           Unattended.Talker_Ear = case_when(Attended.Talker == "Talker.L" ~ "Right",
                                             Attended.Talker == "Talker.R" ~ "Left",
                                             T ~ "NA"), 
  
           
           # Correct Response
           Response.Correct = case_when(Item.Type == "Test" ~ "NA",
                                       Item.Type == "Critical" & Response == "word" ~ "True",
                                       Attended.Talker_Sound == "Word" & Response == "word" ~ "True", 
                                       Attended.Talker_Sound == "Nonword" & Response == "non-word" ~ "True",
                                       T ~ "False")) %>%

          # Correct Response Attended Sex
          mutate(
            speaker_attended_sex = case_when(
              speaker_attended_sex == "male" ~ "Male",
              speaker_attended_sex == "female" ~ "Female",
              T ~ NA
            ),
            
            Correct_Attended.Talker = case_when(
             Phase != "Test" &  speaker_attended_sex == Attended.Talker_Gender ~ "True", 
             Phase == "Test" ~ "NA",
             T ~ "False")
            ) %>%

#-----  
    # Change Condition factor labels
    mutate(
      Condition_Attended.Ear = case_when(
        AttendedTalkerEar == "L" ~ "Left", 
        T ~ "Right"),
      
      Condition_Attended.Gender = case_when(
        AttendedTalkerGender == "M" ~ "Male", 
        T ~ "Female"),
      
      Condition_Attended.Material = case_when(
        AttendedTalkerMaterial == "A" ~ "A", 
        T ~ "B"),
      
      Condition_Attended.Label = case_when(
        AttendedTalkerLabel == "S" ~ "?s",
        AttendedTalkerLabel == "Sh" ~ "?sh",
        T ~ NA)
    ) %>%
#-----
  
  # Get key character based on Gevher's reading of the JS code (labelingBlock.js)
  # (and make sure that "B" responses lead to NAs in the Response variable)
  mutate(
    Response = ifelse(Response == "NO RESPONSE PROVIDED", NA, Response),
    Response.Key.Character = case_when(
      Response.Key == "77" ~ "M",
      Response.Key == "88" ~ "X",
      T ~ NA_character_)) %>% 
    
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
    mutate_at(vars(Response.Key, Time.StartOfStimulus, Time.EndOfTrial, Time.ResponseRT), 
              as.numeric) %>%
    mutate_at(vars(ParticipantID, Phase, starts_with("Condition"), starts_with("Item"),
                   Response, AssignmentID), factor) %>%    # removed Response.Key.Character, Task 
   
    group_by(ParticipantID) %>%
    mutate(
      Duration.AllPhases = (max(Time.EndOfTrial) - min(Time.StartOfStimulus)) / 60000) %>%
    ungroup() %>%
    # Remove unnecessary columns and order remaining columns
     select(-c(starts_with("Talker.Test"),
                         starts_with("Talker.L"),
                         starts_with("Talker.R"),
                         starts_with("AttendedTalker"),
               Attended.Talker, Unattended.Talker, AssignmentID, Stimulus, Blank_col)) %>%
    arrange(Experiment, ParticipantID, Phase, Block, Trial) %>% 

  
  return(.data)
}
