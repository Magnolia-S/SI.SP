/*
 * Author: Dave Kleinschmidt
 *
 *    Copyright 2012 Dave Kleinschmidt and
 *        the University of Rochester BCS Department
 *
 *    This program is free software: you can redistribute it and/or modify
 *    it under the terms of the GNU Lesser General Public License version 2.1 as
 *    published by the Free Software Foundation.
 *
 *    This program is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU Lesser General Public License for more details.
 *
 *    You should have received a copy of the GNU Lesser General Public License
 *    along with this program.
 *    If not, see <http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html>.
 *
 * Modified by:Florian Jaeger (2020-2023)
*/

/* TO DO:

- Update what URL our ecxperiments map to (email chris)
- Update consent form and make sure it's in the right location

- check whether headphone test can be implemented. I think Maryann's experiment included such a test

*/

// Variables defined here are globally visible
var _curBlock;
var vidSuffix, audSuffix;
var RESP_DELIM = ';';
var e;

$(document).ready(function() {
  ////////////////////////////////////////////////////////////////////////
  // General setup
  ////////////////////////////////////////////////////////////////////////
  // take break every k trials
  ////////////////////////////////////////////////////////////////////////
  // Create experiment
  ////////////////////////////////////////////////////////////////////////
  e = new Experiment({
      platform: 'prolific',
      rsrbProtocolNumber: 'RSRB00045955',
      rsrbConsentFormURL: 'https://www.hlp.rochester.edu/experiments/consent/RSRB45955_Consent_2024-01-12.pdf',
      survey: 'surveys/post_survey.html',
      cookie: 'PRATTLIM', // perceptual recalibration - attentional limits
      requiredURLparams: ['AttendedTalkerLabel', 'AttendedTalkerGender', 'AttendedTalkerEar', 'AttendedTalkerMaterial', 'ExposureOrder', 'TestOrder', 'respKeyExp', 'respKeyTest']
  });
  e.init();

  // Define srucure of experimentsblock_type = ['exposure', 'exposure', 'exposure', 'exposure', 'exposure', 'exposure', 'test', 'test', 'test', 'test'];
  block_type = Array(10).fill('exposure').concat(Array(12).fill('test'));

  ////////////////////////////////////////////////////////////////////////
  // Parse relevant URL parameters -- DEBUG MODE
  ////////////////////////////////////////////////////////////////////////
  // e.urlparams is a dictionary (key-value mapping) of all the url params.
  // you can use these to control the conditions, nuisance factors, and lists.

  // You can use the following parameter to skip parts of the experiment for debugging:
  // [i]instructions, pre-[l]oad, p[ractice], e[xposure], t[est], s[urvey]
  var skipTo = e.urlparams['skipTo'];

  ////////////////////////////////////////////////////////////////////////
  // Parse relevant URL parameters -- automatically inferred
  ////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////
  // Parse relevant URL parameters -- USER DEFINED
  ////////////////////////////////////////////////////////////////////////

  // Is s or sh shifted for the attended talker?
  // S or SH
  var AttendedTalkerLabel = e.urlparams['AttendedTalkerLabel'];
  throwMessage('AttendedTalkerLabel set to: '.concat(AttendedTalkerLabel));
  if ($.inArray(AttendedTalkerLabel, ['S', 'SH']) < 0) throwError('Unrecognized AttendedTalkerLabel.');

  var AttendedTalkerGender = e.urlparams['AttendedTalkerGender'];
  throwMessage('AttendedTalkerGender set to: '.concat(AttendedTalkerGender));
  if ($.inArray(AttendedTalkerGender, ['M', 'F']) < 0) throwError('Unrecognized AttendedTalkerGender.');
  var instruction_talker =  AttendedTalkerGender == 'M' ? 'male' : 'female';


  var AttendedTalkerEar = e.urlparams['AttendedTalkerEar'];
  throwMessage('AttendedTalkerEar set to: '.concat(AttendedTalkerEar));
  if ($.inArray(AttendedTalkerEar, ['L', 'R']) < 0) throwError('Unrecognized AttendedTalkerEar.');

  var AttendedTalkerMaterial = e.urlparams['AttendedTalkerMaterial'];
  throwMessage('AttendedTalkerMaterial set to: '.concat(AttendedTalkerMaterial));
  if ($.inArray(AttendedTalkerMaterial, ['A', 'B']) < 0) throwError('Unrecognized AttendedTalkerMaterial.');

  var ExposureOrder = e.urlparams['ExposureOrder'];
  throwMessage('ExposureOrder set to: '.concat(ExposureOrder));
  if ($.inArray(ExposureOrder, ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10']) < 0) throwError('Unrecognized ExposureOrder.');

  var TestOrder = e.urlparams['TestOrder'];
  throwMessage('TestOrder set to: '.concat(TestOrder));
  if ($.inArray(TestOrder, ["A", "B"]) < 0) throwError('Unrecognized TestOrder.');

  // How should X and M be mapped to S and SH responses during exposure?
  // 0 ('X':'word', 'M':'non-word') or 1 ('X':'non-word', 'M':'word')
  var respKeyExp = e.urlparams['respKeyExp'];
  // How should X and M be mapped to S and SH responses during test?
  // 0 ('X':'S', 'M':'SH') or 1 ('X':'SH', 'M':'S')
  var respKeyTest = e.urlparams['respKeyTest'];
  throwMessage('respKeyExp set to: '.concat(respKeyExp));
  throwMessage('respKeyTest set to: '.concat(respKeyTest));

  var keys_exp, keys_test;
  if (respKeyExp == '0') {
    keys_exp = {'X':'word', 'M':'non-word'};
  } else if (respKeyExp == '1') {
    keys_exp = {'X':'non-word', 'M':'word'};
  } else {
    throwError("Unrecognized response key mapping for exposure.");
  }
  if (respKeyTest == '0') {
    keys_test = {'X':'ASI', 'M':'ASHI'};
  } else if (respKeyTest == '1') {
    keys_test = {'X':'ASHI', 'M':'ASI'};
  } else {
    throwError("Unrecognized response key mapping for test.");
  }

  ////////////////////////////////////////////////////////////////////////
  // Additional constants
  ////////////////////////////////////////////////////////////////////////

  // Should practice trials provide feedback? And, if so, should mistakes result in the practice session
  // being repeated?
  var practFeedback = true;
  var practEnforcePerfection = true;

  ////////////////////////////////////////////////////////////////////////
  // Create and add instructions based on experimental condition (based on whether there is an exposure phase or not)
  ////////////////////////////////////////////////////////////////////////
  var instruction_payment, instruction_experiment, instruction_pracice, instruction_exposure, instruction_test;
  instruction_payment = 'The experiment takes 15-20 minutes to complete and you will be paid $3.20.';
  instruction_experiment = 'The purpose of this experiment is to investigate listeners\’ ability to pay attention to a ' +
      'specific talker when there are multiple talkers speaking at once. <br><br>' +
      'The experiment has two parts. In the first part, you will hear recordings of a female and a male talker speaking simultaneously. ' +
      'Your task is to <strong>focus only on the ' + instruction_talker + ' talker</strong>. For each recording, you have to determine ' +
      'whether the ' + instruction_talker + ' talker produced a word or a non-word. <br><br>' +
      'In the second part, you will hear recordings from the same two talkers. This time, each recording will only contain ' +
      'speech from one talker at a time.';
  instructions_practice = '<h3>Practice for Part 1</h3><p>Let\'s start with some practice.<BR><BR> ' +
      'You will hear a series of recordings of a female and a male talker speaking at the same time. Your task is to <strong>focus only on the ' +
      instruction_talker + ' talker</strong>. For each recording, you are asked to determine whether the ' + instruction_talker +
      ' talker produced a real word of English (for example, "table") or a non-word (for example, "fultic"). Please press "' +
      Object.keys(keys_exp)[0] + '" to respond "' + keys_exp[Object.keys(keys_exp)[0]] + '" and "' +  Object.keys(keys_exp)[1] +
      '" to responsd "' + keys_exp[Object.keys(keys_exp)[1]] + '".<br><br>Please listen carefully ' +
      'to the entire recording, and then respond as quickly and accurately as possible. If you respond before the recording stopped ' +
      'playing, you will see a pop-up message reminding you to wait until the recording has stopped playing.<BR><BR>' +
      'You can make as many mistakes as you\'d like during the practice block. The purpose of these trials is to help ' +
      'you familiarize yourself with the task. You will receive feedback after each response. If your response is incorrect, ' +
      'the practice block will restart.</p>';
  instruction_exposure = 'You have successfully completed the practice block. Now we can begin the experiment!<br><br>' +
      '<h3>Part 1</h3><p>Remember to press the corresponding key on your keyboard to <strong>identify whether the ' +
      instruction_talker + ' talker is saying a word of English or a non-word</strong>.<br><br>Listen carefully, and ' +
      'when the recording has finished, answer as quickly and accurately as possible.<BR><BR>It is OK to make a few ' +
      'errors---that\'s human! We will only ever reject work when somebody is <em>clearly</em> gaming the system by ' +
      'pressing random keys, reloading this page, or repeatedly taking this experiment. ';
  // Only show this part of the instruction if feedback was given during practice
  if (practFeedback === true) {
    instruction_exposure = instruction_exposure +
    'Unlike during practice, you will <strong> not</strong> receive feedback after each trial, but we are still recording your responses.</p>';
  } else {
    instruction_exposure = instruction_exposure + '</p>';
  }

  instruction_test = '<h3>Part 2</h3><p>Next, you will hear the same two talkers as during the first part of the experiment. ' +
      'However, in this part of the experiment, the talkers will be presented individually. For each recording, <strong>your task ' +
      'is to decide whether the talker is saying "ASI" or a "ASHI".</strong> You will use the same keys as before but now "' +
      Object.keys(keys_test)[0] + '" will correspond to "' + keys_test[Object.keys(keys_test)[0]] + '" and "' +  Object.keys(keys_test)[1] +
      '" will correspond to "' + keys_test[Object.keys(keys_test)[1]] + '". Like before, you will see these response options displayed ' +
      'during each trial.<br><br>You will hear multiple recordings from the same talker in a row, and these recordings may sound ' +
      'very similar. This is intentional.<br><br>Please answer as quickly and accurately as possible.<br><br></p>';

  ////////////////////////////////////////////////////////////////////////
  // Create and add instructions
  ////////////////////////////////////////////////////////////////////////
  if ($.inArray(skipTo, ['l', 'p', 's'].concat(Array.from(Array(22).keys()).map(n => String(n + 1)))) < 0) {
    throwMessage("Creating instruction block.");

    var instructions = new InstructionsSubsectionsBlock(
        {
            logoImg: 'JSEXP/img/logo.png',
            title: 'Attentional effects on listening',
            mainInstructions: ['Thank you for your interest in our study!  This is a psychology experiment about how people understand speech. ' +
                               'You will listen to recorded speech, and press a button on the keyboard to tell us what you heard.',
                               '<span style="font-weight:bold;">Please read through each of the following requirements. ' +
                               'If you do not meet all requirements, please do not take this experiment.</span> ' +
                               'You can click the names below to expand or close each section.'],
            subsections: [
                {
                    title: 'Experiment length',
                    content: instruction_payment
                },
                {
                    title: 'Language requirements (grew up speaking American English)',
                    content: "You must be a native speaker of American English. " +
                             "<font color='red'><strong>If you have not spent almost all of your time until the age of 10 speaking English and living in the United States, " +
                             "you are not eligible to participate.</strong></font>",
                    checkboxText: 'I am a native American English speaker.'
                },
                {
                    title: 'Environment requirements (quiet room)',
                    content: 'Please complete this experiment in one sitting and in a quiet room, away from other noise. Please do NOT look at other web pages or other programs ' +
                             'while completing this experiment. It is important that you give this experiment your full attention.',
                    checkboxText: 'I am in a quiet room and will complete this experiment in one sitting.'
                },
                {
                    title: 'Hardware requirements (headphones)',
                    content: [{
                      subtitle: 'Headphones',
                      content: "<font color='red'><strong>It is essential that you wear headphones for this experiment.</strong></font> Otherwise we will NOT " +
                               "be able to use your data.<img id='audiopic' src='JSEXP/img/audiotypes.png' width='600'/>"
                    }],
                    checkboxText: 'I am wearing headphones.'
                },
                {
                  title: 'Headphone check',
                  content: ['Please complete the following headphone test to make sure your audio setup is compatible with this experiment, and that your headphones ' +
                            'are set to a comfortable volume.',
                            function() {
                                var headphoneCheckBlock = new HeadphoneCheckBlock(
                                    {
                                        instructions: '',
                                        implementation: 'McDermottLab'
                                    }
                                );
                                return(headphoneCheckBlock.init());
                            }, "<p></p>"]
                },
                {
                    title: 'Additional requirements',
                    content: ["<font color='red'><strong>Please do NOT take this experiment multiple times, and do NOT reload this page.</strong></font> " +
                              'If you share an MTurk/Prolific account with others who have taken this experiment, please make sure that they have not yet taken this experiment. ' +
                              "We cannot use data from reloaded or repeated experiments, and won't be able to approve your work.",
                              "We use cookies and MTurk/Prolific qualifications to make it easy for you to recognize whether you have taken this experiment previously. " +
                              "If you accept our cookies and do not delete them, this should prevent you from accidentally taking the experiment more than once."],
                    checkboxText: 'I (or others with the same worker ID) have not taken this experiment previously.'
                },
                {
                    title: 'Reasons work can be rejected',
                    content: ['If you pay attention to the instructions and <span style="font-weight:bold;">do not respond randomly </span> your work will be approved. ' +
                              '<span style="color:red;"><strong>Please do NOT reload this page, even if you think you made a mistake.</strong></span> ' +
                              'We will not be able to use your data for scientific purposes, and you will not be able to finish the experiment. ' +
                              "We anticipate some mistakes will be made, but those will NOT affect the approval of your work. ",
                              'We will only reject work if you a) <strong>clearly</strong> do not pay attention to the instructions, b) reload the page, or c) repeat ' +
                              'the experiment. We reject far less than 1% of all completed experiments.'],
                    checkboxText: 'I understand the reasons my work might get rejected.'
                },
                {
                    title: 'Experiment instructions',
                    content: instruction_experiment,
                    checkboxText: 'I have read and understood the instructions.'
                },
                {
                    title: 'Informed consent',
                    content: e.consentFormDiv,
                    checkboxText: 'I consent to participating in this experiment'
                },
                {
                    title: 'Further (optional) information',
                    content: ['Sometimes it can happen that technical difficulties cause experimental scripts to freeze so that you will not be able to submit a experiment. ' +
                              'We are trying our best to avoid these problems. Should they nevertheless occur, we urge you to (1) take a screen shot of your browswer ' +
                              'window, (2) if you know how to also take a screen shot of your Javascript console, and (3) ' +
                              '<a href="mailto:hlplab@gmail.com">email us</a> this information along with the HIT/Experiment ID and your worker/Prolific ID. ',
                              'If you are interested in hearing how the experiments you are participating in help us to understand the human brain, feel free to ' +
                              'subscribe to our <a href="http://hlplab.wordpress.com/">lab blog</a> where we announce new findings. Note that typically about 1-2 years ' +
                              'pass before an experiment is published.'],
                    finallyInfo: true
                }
            ]
        }
    );
    e.addBlock({
        block: instructions,
        onPreview: true});
  } // end of instruction block

  ////////////////////////////////////////////////////////////////////////
  // Function that adds all the blocks when everything's ready and runs the experiment
  // This function is run every time a papa parse completes. Just add all the stimuli together
  // until the final block is reached. Then start creating and adding blocks.
  ////////////////////////////////////////////////////////////////////////
  // declared here so that papaparse can fill these vars and continue_experiment can read them
  var blocks_already_read_in = 0;
  var stimulus_list = [];
  var all_audio_filenames = [];
  var continue_experiment = function(block, stimlist) {
    blocks_already_read_in++;
    throwMessage("Adding stimuli from block " + (block + 1) + " to overall stimulus list.");
    // Add stimuli to those that need to be preloaded and add path prefix to all filenames
    all_audio_filenames = all_audio_filenames.concat(stimlist.filenames.map(f => stimlist.prefix + f));
    throwMessage('Updated list of all stimuli: ' + all_audio_filenames);

    // When last block has been constructed
    if ((blocks_already_read_in) === block_type.length) {
      ////////////////////////////////////////////////////////////////////////
      // Create and add PRELOADING block
      ////////////////////////////////////////////////////////////////////////
      if ($.inArray(skipTo, ['p', 's'].concat(Array.from(Array(22).keys()).map(n => String(n + 1)))) < 0) {
        throwMessage("Preparing preloading block.");
        // Get all the unique filenames
        var unique_audio_filenames = all_audio_filenames.filter(function(item, pos, self) { return self.indexOf(item) == pos; });
        throwMessage('Preparing list of unique audio files for preloading: ' + unique_audio_filenames);

        var preloadingBlock = new MediaLoadingBlock({
          stimuli: new ExtendedStimuliFileList({
            prefix: '',
            mediaType: 'audio',
            filenames:   unique_audio_filenames,
            subtitles:   Array.apply(null, Array(unique_audio_filenames.length)).map(function(){return ""})
          }),
          totalLoadingThreshold: -1, // For 1 minute: 60000
          namespace: 'preload'
        });

        e.addBlock({
          block: preloadingBlock,
          instructions: "<p>Before you begin the experiment, " +
          "we will pre-load some of the audio files now so they don't cause interruptions " +
          "during the rest of the experiment.</p>" +
          '<p>This will also give you an idea of your connection speed to our server. ' +
          'If for some reason the files are loading very slowly, you can return this HIT/experiment.</p>',
          onPreview: false
        });
      } // end of preloading block

      ////////////////////////////////////////////////////////////////////////
      // Create and add PRACTICE block
      ////////////////////////////////////////////////////////////////////////
      if ($.inArray(skipTo, ['s'].concat(Array.from(Array(22).keys()).map(n => String(n + 1)))) < 0) {
        throwMessage("Starting practice block.");

        var filenames_practice = [
          'Filler_W.Corridor.M.L_N.Nawinow.F.R',
          'Filler_N.Kerkrun.F.L_W.Parable.M.R',
          'Filler_W.Heroine.F.L_M.Neramgory.M.R',
          'Filler_N.Rikmaral.M.L_W.Younger.F.R'
        ];
        var mapping_practice = AttendedTalkerGender === 'M' ? {
          'Filler_W.Corridor.M.L_N.Nawinow.F.R' : 'word',
          'Filler_N.Kerkrun.F.L_W.Parable.M.R' : 'word',
          'Filler_W.Heroine.F.L_M.Neramgory.M.R' : 'non-word',
          'Filler_N.Rikmaral.M.L_W.Younger.F.R' : 'non-word'
        } : {
          'Filler_W.Corridor.M.L_N.Nawinow.F.R' : 'non-word',
          'Filler_N.Kerkrun.F.L_W.Parable.M.R' : 'non-word',
          'Filler_W.Heroine.F.L_M.Neramgory.M.R' : 'word',
          'Filler_N.Rikmaral.M.L_W.Younger.F.R' : 'word'
        };

        throwMessage("Filenames for practice: " + filenames_practice.flat());
        var stimuli_practice = new StimuliFileList({
            prefix: 'stimuli/practice/',
            mediaType: 'audio',
            filenames: filenames_practice,
            // Hash that maps filenames to expected response. required if the block uses provideFeedback = true
            mappingStimulusToCorrectResponse: mapping_practice
        });
        var block_practice = new IdentificationBlock({
            stimuli: stimuli_practice,
            respKeys: keys_exp,
            catchTrialInstruction: 'Remember to focus on the ' + instruction_talker + ' talker.',
            catchEventDescription: undefined,
            provideFeedback: true, // if true, provides feedback about correct (expected) response when participants make mistakes
            enforcePerfection: true, // if true, forces reset (repeat) of block every time a mistake is made.
            stimOrderMethod: "shuffle_across_blocks",
            namespace: 'practice',

            // Overwriting handle feedback function default
            handleFeedback: function(e) {
              var currentMediaType = this.media[this.stimOrder[this.n]].type;

              // If no feedback is to be provided, end the trial
              if (!this.provideFeedback) {
                this.end(e);
                return -1;
              } else {
              // Feedback should be provided, so determine what that feedback ought to be
                var pressedKeyLabel = String.fromCharCode(e.which);
                if (pressedKeyLabel === ' ') pressedKeyLabel = "SPACE";

                // Determine what key response was and what that indicates.
                var feedbackString = "You pressed \"" + pressedKeyLabel + "\", indicating that the " + instruction_talker + " tallker produced a " + this.respKeys[String.fromCharCode(e.which)] + ". ";

                // If this was the correct response, provide positive feedback and end the trial
                if (!this.isCatchTrial && (this.respKeys[String.fromCharCode(e.which)] === this.correctResponses[this.n])) {
                  alert(feedbackString +  "This is CORRECT. Click OK to continue.");
                  this.end(e);
                  return -1;
                } else if (this.respKeys[String.fromCharCode(e.which)] !== this.correctResponses[this.n]) {
                  feedbackString += "This is INCORRECT. The " + instruction_talker + " talker produced a " + this.correctResponses[this.n] + ". " +
                    'On trials like this one, you should press "' + valToKey(this.respKeys, this.correctResponses[this.n]) + '".';
                } else {
                  throwError("While computing feedback to the participant, some key event occurred that was not foreseen.");
                }

                feedbackString += "\n\nMaking mistakes during practice is absolutely OK---that's why we have a practice phase. " +
                                  "Remember to listen closely and respond based on whether the " + instruction_talker + " talker says a " +
                                  "real word of English or not. Press OK to continue.";
                alert(feedbackString);

                this.handleMistake(e);
              }
            }
        });

        e.addBlock({
            block: block_practice,
            instructions: instructions_practice,
            onPreview: false
        });
      } // end of practice block

      ////////////////////////////////////////////////////////////////////////
      // Add start block (with 1 stimulus)
      ////////////////////////////////////////////////////////////////////////

      // Calculate relative start and end proportions of progress bar for blocks (to hide block transitions from participants)
      var all_stims_length = 0;
      var stimulus_list_length = [];
      var block_progressBarStartProportion = [];
      var block_progressBarEndProportion = [];
      for (let i = 0; i < block_type.length; i++) {
        // Count all stimuli so far (for progress bar adjustment)
        stimulus_list_length[i] = 0;
        for (let j = 0; j < stimulus_list[i].filenames.length; j++) {
          stimulus_list_length[i] += parseFloat(stimulus_list[i].reps[j]);
        }
        throwMessage("Adding " + stimulus_list_length[i] + " stimuli to overall stim length");
        all_stims_length += stimulus_list_length[i];
      }

      // Make one progressbar for exposure and one for test
      for (let i = 0; i < block_type.length; i++) {
        if (i < 10) {
          block_progressBarStartProportion[i] = i * 8 / 80;
          block_progressBarEndProportion[i] = block_progressBarStartProportion[i] + 8 / 80;
        } else {
          block_progressBarStartProportion[i] = (i - 10) * 6 / 72;
          block_progressBarEndProportion[i] = block_progressBarStartProportion[i] + 6 / 72;
        }
        throwMessage("Block " + (i + 1) + " progress bar start set to " + block_progressBarStartProportion[i] + "; end set to " + block_progressBarEndProportion[i]);
      }

      if ($.inArray(skipTo, ['s']) < 0) {
        var current_instructions, current_catchTrialInstruction, current_stimOrderMethod, current_blockOrderMethod;

        const starting_block = $.inArray(skipTo, Array.from(Array(22).keys()).map(n => String(n + 1))) < 0 ? 0 : parseInt(skipTo) - 1;
        for (let i = starting_block; i < block_type.length; i++) {
          // Before which blocks should what instructions (if any) be shown?
          if (i >= 0 & i < 10) {
            if (i === 0) {
              current_instructions = instruction_exposure;
            } else {
              current_instructions = undefined;
            }
            current_catchTrialInstruction = 'Remember to focus on the ' + instruction_talker + ' talker.';
          } else if (i >= 10) {
            if (i === 10) {
              current_instructions = instruction_test;
            } else {
              current_instructions = undefined;
            }
            current_catchTrialInstruction = '';
          } else {
            current_instructions = undefined;
            current_catchTrialInstruction = undefined;
          }

          // What is the key mapping for the current block?
          if (block_type[i] === 'exposure') {
            current_key_assignment = keys_exp;
          } else if (block_type[i] === 'test') {
            current_key_assignment = keys_test;
          } else {
            current_key_assignment = undefined;
          }

          throwMessage("Adding block " + (i + 1) + " of type " + block_type[i]);
          var current_block = new IdentificationBlock({
            stimuli: stimulus_list[i],
            catchTrialInstruction: current_catchTrialInstruction,
            respKeys: current_key_assignment,
            stimOrderMethod: "dont_randomize",
            stimOrderMethod: 'shuffle_across_blocks',
            blockOrderMethod: 'shuffle_blocks',
            progressBarStartProportion: block_progressBarStartProportion[i],
            progressBarEndProportion: block_progressBarEndProportion[i],
            namespace: block_type[i] + (i + 1)
          });

          e.addBlock({
            block: current_block,
            instructions: current_instructions,
            onPreview: false,
            showInTest: true
          });
        } // end of exposure-test block for-loop
      } // end of exposure-test blocks

      $("#continue").hide();
      e.nextBlock();
    } // All blocks have been added -- end of if (block === block_type.length)
  } // end of continue_experiment() function

  // Prevent loading of stimuli on preview.
  if (e.previewMode) {
    e.nextBlock();
  } else {
    ////////////////////////////////////////////////////////////////////////
    // Define general materials and mappings for visual grids
    ////////////////////////////////////////////////////////////////////////
    var list;
    for (let i = 0; i < block_type.length; i++) {
      throwMessage("Preparing block " + (i + 1) + " of type " + block_type[i]);

      if (block_type[i] === 'exposure') {
        ////////////////////////////////////////////////////////////////////////
        // Create and add EXPOSURE stimuli filename
        ////////////////////////////////////////////////////////////////////////
        list = 'lists/' + block_type[i] + '-' +
                AttendedTalkerGender + '-' +
                AttendedTalkerEar + '-' +
                AttendedTalkerMaterial + '-' +
                AttendedTalkerLabel + '-Order' +
                ExposureOrder + '-Block' +
                (i + 1) + '.csv';
      } else if (block_type[i] === 'test') {
        ////////////////////////////////////////////////////////////////////////
        // Create and add TEST stimuli filename
        ////////////////////////////////////////////////////////////////////////
        list = 'lists/' + block_type[i] + '-Order' +
                TestOrder + '-Block' +
                (i + 1) + '.csv';
      } else throwError("Block type not recognized: " + block_type[i]);

        throwMessage("Parsing " + block_type[i] + " list for block " + (i + 1) + ": " + list);
        Papa.parse(list, {
          download: true,
          header: true,
          delimiter: ',',
          skipEmptyLines: true,
          complete: function(list) {
            // Read in information from list file
            stimulus_list[i] = new StimuliFileList({
              prefix: 'stimuli/' + block_type[i] + '/',
              mediaType: 'audio',
              filenames: getFromPapa(list, 'filename'),
              reps: getFromPapa(list, 'reps')
            });
            throwMessage("Done parsing " + block_type[i] + " list for block " + (i + 1));

            continue_experiment(i, stimulus_list[i]);
          }
        }); // end of papa parse
      } // end of for loop
    } // end of what happens when not in preview mode

}); // end of document ready function
