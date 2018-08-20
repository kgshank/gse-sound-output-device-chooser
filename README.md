# Gnome Shell Extension - Sound Input & Output Device Chooser
A simple selector to enabled selection of sound source and sink based on Gnome Control Center

# Note: Unable to concentrate much on the development, but I am still watching the issue list and most of them are related to the same problem in the extension architecture. Please feel free to update / create new issues. I will update the extension in the near future

###### Install URL: [extensions.gnome.org](https://extensions.gnome.org/extension/906/sound-output-device-chooser/)

### Gnome shell versions compatible
* 3.18
* 3.20
* 3.22

### Notes:
* May conflict with extensions which modify volume menu.
* Extension works with Volume Mixer extension. Restart shell, if errors encountered.

### Changelog
-----------------------
#### 16
* Redesinged preferences dialog, credits @eliandoran
* Rewritten and restructed code
* gnome shell 3.22 compatibility

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



