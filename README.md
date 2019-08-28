# Gnome Shell Extension - Sound Input & Output Device Chooser
A simple selector to enabled selection of sound source and sink based on Gnome Control Center

### Dependency
Python 2 or 3. New version needs python as optional dependency. Use option to turn off new profile identification logic, if python is to be avoided. But the old logic has language dependecy and works only with English display language

### Installation Instructions

The official method to install this extension is from [extensions.gnome.org](https://extensions.gnome.org/extension/906/sound-output-device-chooser).

To install the extension from source, clone the repository and place it in the `gnome-shell/extensions` directory
```
git clone https://github.com/kgshank/gse-sound-output-device-chooser.git
cp --recursive gse-sound-output-device-chooser $HOME/.local/share/gnome-shell/extensions/sound-output-device-chooser@kgshank.net
```

Enable the extensions from [GNOME Tweaks](https://wiki.gnome.org/Apps/Tweaks).

### Gnome shell versions compatible
* 3.32
* For older versions install from [extensions.gnome.org](https://extensions.gnome.org/extension/906/sound-output-device-chooser/)


### Notes:
* May conflict with extensions which modify volume menu.
* Extension works with Volume Mixer extension. Restart shell, if errors encountered.

### Changelog
-----------------------
#### 22
* Failback to old method of profile identification incase of Python
errors.

#### 21
* Remove unsupported shell versions from compatibility

#### 20
* Use python for identifying profiles available
* Option to control new profile identification logic
* Turn off/on log message in options

#### 17
* Updated to shell version 3.30.
* Lots of bug fixes, thanks @HarlemSquirrel and @mdmower for the support

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



