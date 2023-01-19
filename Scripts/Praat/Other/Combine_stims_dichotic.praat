# # ## ### ##### ########  #############  ##################### 
# Praat Script
# Combine stims dichotic
#
# Shawn Cummings
# January 2023
##################### 
# INSTRUCTIONS/INFO
#
# This script combines sounds in a subdirectory for dichotic stim presentation of
# multiple simultaneous items. Combination is determined via a .csv, which must be
# prepared by the user ahead of time. 
#
# The mapping csv, as well as all sounds to be blended, must be in the same directory.
# 
# The mapping csv should contain two columns, named "Left" and "Right".
# The rows of these columns should include filenames (without .wav extension)
############# 
######## 
#####
###
##
#
#
clearinfo

form gradually blend two sounds
	comment Choose the directory containing sounds to blend:
	comment Your mapping .csv should also be in this directory. 
	text directory C:\Users\shawn\Desktop\script_test

	comment What is your mapping .csv called?
	text mapping mapping.csv

	comment Do you also want to add 200 ms of silence to the beginning of each stim?
	boolean addSilence 1
endform

mapping$ = Read Table from comma-separated file... 'directory$'/'mapping$'
nrows = Get number of rows


if addSilence
	silence = Create Sound from formula... silence 2 0 0.2 16000 0
endif

for row to nrows
	select Table mapping
	left$ = Get value: row, "Left"
	right$ = Get value: row, "Right"

	sound.left = Read from file... 'directory$'/'left$'.wav
	sound.right = Read from file... 'directory$'/'right$'.wav

	selectObject: "Sound 'left$'", "Sound 'right$'"

	Combine to stereo
	Rename... blended

	if addSilence
		selectObject: "Sound silence", "Sound blended"
		Concatenate
	endif
	
	Save as WAV file... 'directory$'/'left$'.L_'right$'.R.wav
endfor

clearinfo