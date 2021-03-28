### Change log
-----------------------
#### 35,36 & 37
* V40 compatibility updates
* Remove C pointer references

#### 34 & 33
* Fixes for issues 
  * [131](../../issues/131)
  * [123](../../issues/123)
  * [109](../../issues/109)
  * [108](../../issues/108)
  * [105](../../issues/105)
* Removed option to "Show" device always in port settings, due to inconsistent behaviour and shell crashes

#### 32
* Updates for Gnome Shell 3.38 compatibility

#### 31
* Translation update - Portuguese 

#### 30
* Fixes for issue [97](https://github.com/kgshank/gse-sound-output-device-chooser/issues/97)
* Error in preferences dialog due to log

#### 29
* Fixes for issue [95](https://github.com/kgshank/gse-sound-output-device-chooser/issues/95)
#### 27 & 28
* Fixes for broken updates from extension.gnome.org

#### 26
* Updates for Gnome Shell 3.36 compatibility

#### 25
* Fix Issues [66](https://github.com/kgshank/gse-sound-output-device-chooser/issues/66) / [68](https://github.com/kgshank/gse-sound-output-device-chooser/issues/68) - duplicate list after screen lock and unlock 

#### 24
* Remove Mainloop timeout
* New option to expand volume menu based on length of device names

#### 23
* Updates for Gnome Shell 3.34 compatibility
* Minor UI changes

#### 22
* Fallback to old method of profile identification in case of Python errors.

#### 21
* Remove unsupported shell versions from compatibility

#### 20
* Use Python for identifying profiles available
* Option to control new profile identification logic
* Turn off/on log message in options

#### 17
* Updated to shell version 3.30.
* Lots of bug fixes, thanks @HarlemSquirrel and @mdmower for the support

#### 16
* Redesigned preferences dialog, credits @eliandoran
* Rewritten and restructured code
* Gnome shell 3.22 compatibility

#### 15
* New option to show/hide input devices
* New option to show/hide output devices
* Bug fix for card[cardIndex] undefined error in convenience.js

#### 14
* Included missing files

#### 13
* Option to show input volume control slider
* Bug fixes to hide sound devices without a valid card (network devices etc)
* Remove unnecessary code
