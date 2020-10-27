# Gnome Shell Extension - Sound Input & Output Device Chooser
A simple selector to enabled selection of sound source and sink based on Gnome Control Center

### Dependency
Python 2 or 3. New version needs Python as optional dependency. Use option to turn off new profile identification logic, if Python is to be avoided. But the old logic has language dependency and works only with English display language

### Installation Instructions

The official method to install this extension is from [extensions.gnome.org](https://extensions.gnome.org/extension/906/sound-output-device-chooser).

To install the extension from source, clone the repository and place it in the `$HOME/.local/share/gnome-shell/extensions` directory
```
git clone https://github.com/kgshank/gse-sound-output-device-chooser.git
cp --recursive gse-sound-output-device-chooser/sound-output-device-chooser@kgshank.net $HOME/.local/share/gnome-shell/extensions/sound-output-device-chooser@kgshank.net
```

Enable the extensions from [GNOME Tweaks](https://wiki.gnome.org/Apps/Tweaks).

### Gnome shell versions compatible
* 3.38
* 3.36
* 3.34
* 3.32
* For older versions install from [extensions.gnome.org](https://extensions.gnome.org/extension/906/sound-output-device-chooser/)


### Notes:
* May conflict with extensions which modify volume menu.
* Extension works with Volume Mixer extension. Restart shell, if errors encountered.

### [Change log](CHANGELOG.md)

