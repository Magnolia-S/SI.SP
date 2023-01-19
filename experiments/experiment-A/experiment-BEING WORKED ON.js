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

*/

// Variables defined here are globally visible
var _curBlock;
var vidSuffix, audSuffix;
var RESP_DELIM = ';';


$(document).ready(function() {
  ////////////////////////////////////////////////////////////////////////
  // General setup
  ////////////////////////////////////////////////////////////////////////
  // take break every k trials
  var breakEvery = 100;

  ////////////////////////////////////////////////////////////////////////
  // Create experiment
  ////////////////////////////////////////////////////////////////////////
  var e = new Experiment({
      rsrbProtocolNumber: 'RSRB00045955',
      rsrbConsentFormURL: 'https://www.hlp.rochester.edu/experiments/consent/RSRB45955_Consent_2024-01-12.pdf',
      survey: 'surveys/post_survey.html',
      cookie: 'PRATTLIM', // perceptual recalibration - attentional limits
      requiredURLparams: ['AttendedTalkerLabel', 'AttendedTalkerGender', 'AttendedTalkerEar', 'AttendedTalkerMaterial', 'ExposureOrder', 'TestOrder', 'respKeyExposure', 'respKeyTest']
  });
  e.init();

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

  var AttendedTalkerEar = e.urlparams['AttendedTalkerEar'];
  throwMessage('AttendedTalkerEar set to: '.concat(AttendedTalkerEar));
  if ($.inArray(AttendedTalkerEar, ['L', 'R']) < 0) throwError('Unrecognized AttendedTalkerEar.');

  var AttendedTalkerMaterial = e.urlparams['AttendedTalkerMaterial'];
  throwMessage('AttendedTalkerMaterial set to: '.concat(AttendedTalkerMaterial));
  if ($.inArray(AttendedTalkerMaterial, ['A', 'B']) < 0) throwError('Unrecognized AttendedTalkerMaterial.');

  var ExposureOrder = e.urlparams['ExposureOrder'];
  throwMessage('ExposureOrder set to: '.concat(ExposureOrder));
  if ($.inArray(ExposureOrder, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']) < 0) throwError('Unrecognized ExposureOrder.');

  var TestOrder = e.urlparams['TestOrder'];
  throwMessage('TestOrder set to: '.concat(TestOrder));
  if ($.inArray(TestOrder, ["AttendedFirst", "UnattendedFirst"]) < 0) throwError('Unrecognized TestOrder.');

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
  // Starting at NORM-D, we added the option of having a preloading block that loads all stimuli prior to
  // practice, exposure and test.
  var preloading = true;

  ////////////////////////////////////////////////////////////////////////
  // Create and add instructions based on experimental condition (based on whether there is an exposure phase or not)
  ////////////////////////////////////////////////////////////////////////
  var instruction_payment, instruction_experiment, instruction_exposure, instruction_test;
  instruction_payment = 'The experiment takes 15-20 minutes to complete and you will be paid $2.00.';
  instruction_experiment = 'This experiment has two parts. In the first part, you will see and hear a female speaker saying words and non-words. ' +
                       'You will have to determine whether each word she produces is a word or a non-word. In the second part, you will hear words ' +
                       'from the same speaker and determine whether these words contain an "s" or an "sh" sound. The "s" sound is like the sound at ' +
                       'the beginning of the words "sat" and "sofa". The "sh" sound is like the sound at the beginning of the words "shine" and "sheep".';
  instruction_exposure = 'That was the end of the practice phase. Now it\'s time to start! <strong>Remember to press the corresponding key on your keyboard to identify ' +
                  'whether the speaker is saying a word of English or not</strong> (press "B" only if you see a white dot, which will be much less often than ' +
                  'during the practice phase).<br><br>' +
                  'Listen and watch carefully, and answer as quickly and accurately as possible.<BR><BR>' +
                  'It is OK to make a few errors---that\'s human! We will only ever reject work when somebody is <em>clearly</em> gaming the ' +
                  'system by pressing random keys, reloading this page, or repeatedly taking this experiment. '
    // Only show this part of the instruction if feedback was given on every trial during practice
    if (practFeedback === true) {
                  instruction_exposure = instruction_exposure +
                  'Unlike during practice, you won’t any longer be receiving popup feedback after each trial, but we will still be recording your responses.</p>';
    } else { instruction_exposure = instruction_exposure + '</p>'; }
    instruction_test = '<h3>Phase 2</h3><p>Next, you will see and hear the same speaker as during the preceding parts of the experiment. <strong>' +
                       'This time, your task is to decide whether the speaker is saying "asi" or a "ashi".</strong> Please answer as quickly and ' +
                       'accurately as possible, without rushing. You may hear similar sounds several times.<br><br>As in the preceding parts of ' +
                       'the experiment, press "B" if (and only if) you see ' + instruction_test_catch + '.<br><br></p>';
  }

  ////////////////////////////////////////////////////////////////////////
  // Create and add instructions
  ////////////////////////////////////////////////////////////////////////
  if ($.inArray(skipTo, ['l', 'p', '1', '2', '3', '4', '5', '6', '7', '8', '9', 's']) < 0) {
    throwMessage("Creating instruction block.");

    var instructions = new InstructionsSubsectionsBlock({
      logoImg: 'JSEXP/img/logo.png',
      title: 'Listen and click',
      mainInstructions: ['Thanks for your interest in our study!  This HIT is a psychology experiment about how people understand speech. Your task will be to listen to words, and to click on a word on screen to tell us what you heard.',
      'Please read through each of the following items that will inform you about the study and its requirements. You can click the names below to expand or close each section.','<span style="font-weight:bold;">It is extremely important that you use over-the-ear headphones of good sound quality for this experiment. If your headphones cost less than $30, then it is likely that they do not fulfill our criteria. We apologize for the inconvenience but appreciate if you return this HIT if that is the case. </span>',
      '<span style="font-weight:bold;">Please do not take this experiment more than once!</span>'],
      subsections: [
        {
          title: 'Experiment length',
          content: 'The experiment will take ' + experiment_duration +' minutes to complete and you will be paid $' + experiment_payment + ' USD.',
        },
        {
          title: 'Eligibility requirements',
          content: ['Please complete this HIT in a quiet room, away from other noise ' +
          'and wearing over-the-ear headphones.  Please do not look at other' +
          ' web pages or other programs while completing this HIT, as it is very' +
          ' important that you give it your full attention.',
          {
            subtitle: 'Language requirements',
            content: '<span style="font-weight:bold;">You must be a native speaker of American English.</span> If you have not spent almost all of your time until the age of 10 speaking English and living in the United States, you cannot participate.'
          },
          {
            subtitle: 'Repeats/multiple HITs',
            content: 'Do not take this hit if you (or others using your worker ID) have previously taken this experiment. <span style="font-weight:bold;">If you submit multiple assignments of this experiment, your work will be rejected. </span>  If you are unsure, please <a target="_blank" href="mailto: hlplab@gmail.com">email us</a> and we can check.'
          },
          {
            subtitle: 'Computer requirements',
            content: 'This experiment requires that your browser support javascript and that you have working headphones and a mouse (a laptop trackpad will not work). Please close any extra tabs or applications to help prevent lag.'
          }
        ],
        checkboxText: 'I have read and understand the requirements.'
      },
      {
        title: 'Sound check',
        content: ['Please complete the following sound test to make sure your browser is compatible with this experiment, and that your headphones are set to a comfortable volume. It is important that you keep your speakers at the same volume throughout the experiment and that you do not remove your headphones after adjusting your sound. Enter the word that you hear into each box.',
        function() {
          var soundcheck = new SoundcheckBlock(
            {
              items: [
                {
                  filename: 'stimuli/soundcheck/cabbage',
                  answer: 'cabbage'
                },
                {
                  filename: 'stimuli/soundcheck/lemonade',
                  answer: 'lemonade'
                }
              ],
              instructions: ''
            }
          );
          return(soundcheck.init());
        }]
      },
      {
        title: 'Experiment instructions',
        content: [instruction_experiment,
          {
            subtitle: 'Reasons work can be rejected:',
            content: 'Please make sure to give yourself enough time to finish the entire experiment in one session. If you pay attention to the instructions and <span style="font-weight:bold;">do not click randomly </span> your work will get approved. <span style="color:red;">Please never reload this page, even if you think you made a mistake.</span> It means that we cannot use your data for scientific purposes. Many, if not most, participants make a few mistakes in our experiments. That\'s perfectly OK and might, in fact, be of interest to us. We will only reject work that is a) <strong>clearly</strong> just random guessing, b) reloading the page, or c) repeating the experiment with the same worker ID.'
          }],
          checkboxText: 'I have read and understood the instructions, and why work can be rejected.'
        },
        {
          title: 'Informed consent',
          content: e.consentFormDiv,
          checkboxText: 'I consent to participating in this experiment'
        },
        {
          title: 'Further (optional) information',
          content: ['Sometimes it can happen that technical difficulties cause experimental scripts to freeze so that you will not be able to submit a HIT. We are trying our best to avoid these problems. Should they nevertheless occur, we urge you to <a href="mailto:hlplab@gmail.com">contact us</a>, and include the HIT ID number and your worker ID.',
          'If you are interested in hearing how the experiments you are participating in help us to understand the human brain, feel free to subscribe to our <a href="http://hlplab.wordpress.com/">lab blog</a> where we announce new findings. Note that typically about one year passes before an experiment is published.'],
          finallyInfo: true
        }
      ]
    });

    throwMessage("Adding instruction block.");
    e.addBlock({
      block: instructions,
      onPreview: true
    });
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
  var continue_experiment = function(block, filenames) {
    blocks_already_read_in++;
    throwMessage("Adding stimuli from block " + (block + 1) + " to overall stimulus list.");
    // Add stimuli to those that need to be preloaded and add path prefix to all filenames
    all_audio_filenames = all_audio_filenames.concat(filenames);
    throwMessage('Updated list of all stimuli: ' + all_audio_filenames);

    // When last block has been constructed
    if ((blocks_already_read_in) === block_type.length) {
      ////////////////////////////////////////////////////////////////////////
      // Create and add PRELOADING block
      ////////////////////////////////////////////////////////////////////////
      if ($.inArray(skipTo, ['p', '1', '2', '3', '4', '5', '6', '7', '8', '9', 's']) < 0) {
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
          'If for some reason the files are loading very slowly, you can return this HIT and move on, ' +
          'without wasting your time on the rest of the experiment.</p>',
          onPreview: false
        });
      } // end of preloading block

      ////////////////////////////////////////////////////////////////////////
      // Create and add PRACTICE block
      ////////////////////////////////////////////////////////////////////////
      if ($.inArray(skipTo, ['1', '2', '3', '4', '5', '6', '7', '8', '9', 's']) < 0) {
        throwMessage("Starting practice block.");
        throwError("... practice block not yet implemented");
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
      for (let i = 0; i < block_type.length; i++) {
        if (i === 0) {
          block_progressBarStartProportion[i] = 0;
        } else {
          block_progressBarStartProportion[i] = block_progressBarEndProportion[i - 1];
        }
        block_progressBarEndProportion[i] = block_progressBarStartProportion[i] + stimulus_list_length[i] / all_stims_length;
        throwMessage("Block " + (i + 1) + " progress bar start set to " + block_progressBarStartProportion[i] + "; end set to " + block_progressBarEndProportion[i]);
      }

      if ($.inArray(skipTo, ['s']) < 0) {
        var current_instructions, current_stimOrderMethod, current_blockOrderMethod;

        const starting_block = $.inArray(skipTo, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10',]) < 0 ? 0 : parseInt(skipTo) - 1;
        for (let i = starting_block; i < block_type.length; i++) {
          if (i === 0) {
            current_instructions = instruction_exposure;
          } else if (i === 5) {
            current_instructions = 'You have the option to take a short break of 2-3 minutes. Please click continue when you are ready for the next part of the experiment.';
          } else if (i === 6) {
            current_instructions = instruction_test;
          } else current_instructions = undefined;

          if (block_type[i] === 'exposure') {
            current_feedback = true;
            current_ITI_responseToTrialEnd = 2000;
          } else {
            current_feedback = false;
            current_ITI_responseToTrialEnd = 0;
          }

          throwMessage("Adding block " + (i + 1) + " of type " + block_type[i])
          var current_block = new VisualGridBlock({
            stimuli: stimulus_list[i],
            images: stimImages,
            instructions: current_instructions,
            imageMapping: imageMapping,
            namespace: block_type[i] + (i + 1),
            allowFeedback: current_feedback,
            autoAdvanceReady: autoAdvanceReady,
            ITI_trialStartToImages: 500,  // time from trial start to showing pictures
            ITI_imagesToNextEvent: 1000,  // time from trial to start to audio play (only relevant if autoAdvanceReady == T)
            ITI_responseToTrialEnd: current_ITI_responseToTrialEnd,
            progressBarStartProportion: block_progressBarStartProportion[i],
            progressBarEndProportion: block_progressBarEndProportion[i],
            OnNegativeFeedback_blinkInterval: 200, // how long is the blink on and off?
            OnNegativeFeedback_blinkNumber: 4,     // how many blinks are shown? (takes blinkInterval ms per blink)
            stimOrderMethod: 'shuffle_across_blocks',
            blockOrderMethod: 'shuffle_blocks',
            imagePositions: [
              'topleft', 'topcenter', 'topright',
              'midleft', 'midright',
              'bottomleft', 'bottomcenter', 'bottomright'],
            randomizeImagePositions: false, // Is true by default. If false, then just uses the list order above
            showFamiliarization: false,
            debugMode: e.debugMode
          });

          e.addBlock({
            block: current_block,
            onPreview: false,
            showInTest: true
          });
        } // end of exposure-test block for-loop
      } // end of exposure-test block

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
    /* Define the images corresponding to each spoken sound/vowel/word */
    var stimImages = {
        hid: 'stimuli/images/hid_letters.png',
        heed: 'stimuli/images/heed_letters.png',
        head: 'stimuli/images/head_letters.png',
        had: 'stimuli/images/had_letters.png',
        hud: 'stimuli/images/hud_letters.png',
        hood: 'stimuli/images/hood_letters.png',
        whod: 'stimuli/images/whod_letters.png',
        hod: 'stimuli/images/hod_letters.png',
    };

    // Define which images will show for a given word depending on the the condition (forward/backward) of that trial
    //
    //    'condition_name': {
    //           'word_1': ['img_1', .., 'img_k'],
    //           ..
    //           'word_j': ['img_1', .., 'img_k'],
    //     }
    var imageMapping = {
      'forward': {
        'TEST': ['heed', 'whod', 'hood', 'hid', 'hud', 'head', 'had', 'hod'],
        'hid': ['heed', 'whod', 'hood', 'hid', 'hud', 'head', 'had', 'hod'],
        'heed': ['heed', 'whod', 'hood', 'hid', 'hud', 'head', 'had', 'hod'],
        'head': ['heed', 'whod', 'hood', 'hid', 'hud', 'head', 'had', 'hod'],
        'had': ['heed', 'whod', 'hood', 'hid', 'hud', 'head', 'had', 'hod'],
        'hud': ['heed', 'whod', 'hood', 'hid', 'hud', 'head', 'had', 'hod'],
        'hood': ['heed', 'whod', 'hood', 'hid', 'hud', 'head', 'had', 'hod'],
        'whod': ['heed', 'whod', 'hood', 'hid', 'hud', 'head', 'had', 'hod'],
        'hod': ['heed', 'whod', 'hood', 'hid', 'hud', 'head', 'had', 'hod']},
      'backward': {
        'TEST': ['heed', 'whod', 'hood', 'hid', 'hud', 'head', 'had', 'hod'].reverse(),
        'hid': ['heed', 'whod', 'hood', 'hid', 'hud', 'head', 'had', 'hod'].reverse(),
        'heed': ['heed', 'whod', 'hood', 'hid', 'hud', 'head', 'had', 'hod'].reverse(),
        'head': ['heed', 'whod', 'hood', 'hid', 'hud', 'head', 'had', 'hod'].reverse(),
        'had': ['heed', 'whod', 'hood', 'hid', 'hud', 'head', 'had', 'hod'].reverse(),
        'hud': ['heed', 'whod', 'hood', 'hid', 'hud', 'head', 'had', 'hod'].reverse(),
        'hood': ['heed', 'whod', 'hood', 'hid', 'hud', 'head', 'had', 'hod'].reverse(),
        'whod': ['heed', 'whod', 'hood', 'hid', 'hud', 'head', 'had', 'hod'].reverse(),
        'hod': ['heed', 'whod', 'hood', 'hid', 'hud', 'head', 'had', 'hod'].reverse()}
    };

    var list;
    for (let i = 0; i < block_type.length; i++) {
      throwMessage("Preparing block " + (i + 1) + " of type " + block_type[i]);

      if (block_type[i] === 'exposure') {
        ////////////////////////////////////////////////////////////////////////
        // Create and add EXPOSURE stimuli filename
        ////////////////////////////////////////////////////////////////////////
        list = 'lists/exposure/exposure-' + cond_exp + "_imageSelection-" + image_selection + "_blockOrder-" + block_order_exp + "_materials-" + materials_exp + "_block-" + (i + 1) + '.csv';
      } else if (block_type[i] === 'test') {
        ////////////////////////////////////////////////////////////////////////
        // Create and add TEST stimuli filename
        ////////////////////////////////////////////////////////////////////////
        list = 'lists/test/test_imageSelection-' + image_selection + "_blockOrder-" + block_order_test + '_block-' + (i + 1) + '.csv';
      } else throwError("Block type not recognized: " + block_type[i]);

        throwMessage("Parsing " + block_type[i] + " list for block " + (i + 1) + ": " + list);
        Papa.parse(list, {
          download: true,
          header: true,
          delimiter: ',',
          skipEmptyLines: true,
          complete: function(list) {
            // Read in information from list file
            stimulus_list[i] = new ExtendedStimuliFileList({
              prefix: '',
              filenames: getFromPapa(list, 'filename'),
              target_words: getFromPapa(list, 'target_word'),
              image_selections: getFromPapa(list, 'image_selection'),
              feedback: parseBoolean(getFromPapa(list, 'feedback')),
              reps: getFromPapa(list, 'reps')
            });
            throwMessage("Done parsing " + block_type[i] + " list for block " + (i + 1));
            continue_experiment(i, stimulus_list[i].filenames);
          }
        }); // end of papa parse
      } // end of for loop
    } // end of what happens when not in preview mode

}); // end of document ready function
