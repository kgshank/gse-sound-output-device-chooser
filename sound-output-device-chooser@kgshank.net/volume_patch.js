// The following file is a modified version of https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/status/volume.js

const { Clutter, Gio, GLib, GObject, Gvc, St } = imports.gi;
const Signals = imports.signals;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Slider = imports.ui.slider;

const ALLOW_AMPLIFIED_VOLUME_KEY = 'allow-volume-above-100-percent';

const VolumeType = {
    OUTPUT: 0,
    INPUT: 1,
};

var StreamSlider = class {
    constructor(control) {
        this._control = control;

        this.item = new PopupMenu.PopupSubMenuMenuItem("", true);
        this.item.sliderIntegraded = true;

        this._inDrag = false;
        this._notifyVolumeChangeId = 0;

        this._slider = new Slider.Slider(0);

        this._soundSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.sound' });
        this._soundSettings.connect('changed::%s'.format(ALLOW_AMPLIFIED_VOLUME_KEY), this._amplifySettingsChanged.bind(this));
        this._amplifySettingsChanged();

        this._sliderChangedId = this._slider.connect('notify::value',
                                                     this._sliderChanged.bind(this));
        this._slider.connect('drag-begin', () => (this._inDrag = true));
        this._slider.connect('drag-end', () => {
            this._inDrag = false;
            this._notifyVolumeChange();
        });

        this.item.connect('scroll-event', (actor, event) => {
            return this._slider.emit('scroll-event', event);
        });

        // Re-add childs in order (omit label and expander)
        this.item.remove_all_children();
        this.item.add_child(this.item._ornamentLabel);
        this.item.add_child(this.item.icon);
        this.item.add_child(this._slider);
        this.item.add_child(this.item._triangleBin);

        this._stream = null;
        this._volumeCancellable = null;
        this.item.icons = [];

        this._forceInvisible = false;
    }

    get stream() {
        return this._stream;
    }

    set stream(stream) {
        if (this._stream)
            this._disconnectStream(this._stream);

        this._stream = stream;

        if (this._stream) {
            this._connectStream(this._stream);
            this._updateVolume();
        } else {
            this.emit('stream-updated');
        }

        this._updateVisibility();
    }

    _disconnectStream(stream) {
        stream.disconnect(this._mutedChangedId);
        this._mutedChangedId = 0;
        stream.disconnect(this._volumeChangedId);
        this._volumeChangedId = 0;
    }

    _connectStream(stream) {
        this._mutedChangedId = stream.connect('notify::is-muted', this._updateVolume.bind(this));
        this._volumeChangedId = stream.connect('notify::volume', this._updateVolume.bind(this));
    }

    _shouldBeVisible() {
        return this._stream != null;
    }

    _updateVisibility() {
        let visible = this._shouldBeVisible();
        this.item.visible = visible;
    }

    scroll(event) {
        return this._slider.scroll(event);
    }

    _sliderChanged() {
        if (!this._stream)
            return;

        let value = this._slider.value;
        let volume = value * this._control.get_vol_max_norm();
        let prevMuted = this._stream.is_muted;
        let prevVolume = this._stream.volume;
        if (volume < 1) {
            this._stream.volume = 0;
            if (!prevMuted)
                this._stream.change_is_muted(true);
        } else {
            this._stream.volume = volume;
            if (prevMuted)
                this._stream.change_is_muted(false);
        }
        this._stream.push_volume();

        let volumeChanged = this._stream.volume !== prevVolume;
        if (volumeChanged && !this._notifyVolumeChangeId && !this._inDrag) {
            this._notifyVolumeChangeId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 30, () => {
                this._notifyVolumeChange();
                this._notifyVolumeChangeId = 0;
                return GLib.SOURCE_REMOVE;
            });
            GLib.Source.set_name_by_id(this._notifyVolumeChangeId,
                '[gnome-shell] this._notifyVolumeChangeId');
        }
    }

    _notifyVolumeChange() {
        if (this._volumeCancellable)
            this._volumeCancellable.cancel();
        this._volumeCancellable = null;

        if (this._stream.state === Gvc.MixerStreamState.RUNNING)
            return; // feedback not necessary while playing

        this._volumeCancellable = new Gio.Cancellable();
        let player = global.display.get_sound_player();
        player.play_from_theme('audio-volume-change',
                               _("Volume changed"),
                               this._volumeCancellable);
    }

    _changeSlider(value) {
        this._slider.block_signal_handler(this._sliderChangedId);
        this._slider.value = value;
        this._slider.unblock_signal_handler(this._sliderChangedId);
    }

    _updateVolume() {
        let muted = this._stream.is_muted;
        this._changeSlider(muted
            ? 0 : this._stream.volume / this._control.get_vol_max_norm());
        this.emit('stream-updated');
    }

    _amplifySettingsChanged() {
        this._allowAmplified = this._soundSettings.get_boolean(ALLOW_AMPLIFIED_VOLUME_KEY);

        this._slider.maximum_value = this._allowAmplified
            ? this.getMaxLevel() : 1;

        if (this._stream)
            this._updateVolume();
    }

    getIcon() {
        if (!this._stream)
            return null;

        let volume = this._stream.volume;
        let n;
        if (this._stream.is_muted || volume <= 0) {
            n = 0;
        } else {
            n = Math.ceil(3 * volume / this._control.get_vol_max_norm());
            n = Math.clamp(n, 1, this._icons.length - 1);
        }
        return this._icons[n];
    }

    getLevel() {
        if (!this._stream)
            return null;

        return this._stream.volume / this._control.get_vol_max_norm();
    }

    getMaxLevel() {
        let maxVolume = this._control.get_vol_max_norm();
        if (this._allowAmplified)
            maxVolume = this._control.get_vol_max_amplified();

        return maxVolume / this._control.get_vol_max_norm();
    }
};
Signals.addSignalMethods(StreamSlider.prototype);

var OutputStreamSlider = class extends StreamSlider {
    constructor(control) {
        super(control);
        this._slider.accessible_name = _("Volume");
        this._icons = [
            'audio-volume-muted-symbolic',
            'audio-volume-low-symbolic',
            'audio-volume-medium-symbolic',
            'audio-volume-high-symbolic',
            'audio-volume-overamplified-symbolic',
        ];
    }

    _connectStream(stream) {
        super._connectStream(stream);
        this._portChangedId = stream.connect('notify::port', this._portChanged.bind(this));
        this._portChanged();
    }

    _findHeadphones(sink) {
        // This only works for external headphones (e.g. bluetooth)
        if (sink.get_form_factor() == 'headset' ||
            sink.get_form_factor() == 'headphone')
            return true;

        // a bit hackish, but ALSA/PulseAudio have a number
        // of different identifiers for headphones, and I could
        // not find the complete list
        if (sink.get_ports().length > 0)
            return sink.get_port().port.includes('headphone');

        return false;
    }

    _disconnectStream(stream) {
        super._disconnectStream(stream);
        stream.disconnect(this._portChangedId);
        this._portChangedId = 0;
    }

    _updateSliderIcon() {
        this.item.icon.icon_name = this._hasHeadphones
            ? 'audio-headphones-symbolic'
            : 'audio-speakers-symbolic';
    }

    _portChanged() {
        let hasHeadphones = this._findHeadphones(this._stream);
        if (hasHeadphones != this._hasHeadphones) {
            this._hasHeadphones = hasHeadphones;
            this._updateSliderIcon();
        }
    }

    _shouldBeVisible() {
        return !this._forceInvisible && super._shouldBeVisible();
    }
};

var InputStreamSlider = class extends StreamSlider {
    constructor(control) {
        super(control);
        this._slider.accessible_name = _("Microphone");
        this._control.connect('stream-added', this._maybeShowInput.bind(this));
        this._control.connect('stream-removed', this._maybeShowInput.bind(this));
        this.item.icon.icon_name = 'audio-input-microphone-symbolic';
        this._icons = [
            'microphone-sensitivity-muted-symbolic',
            'microphone-sensitivity-low-symbolic',
            'microphone-sensitivity-medium-symbolic',
            'microphone-sensitivity-high-symbolic',
        ];

        this._showInputSlider = false;
    }

    _connectStream(stream) {
        super._connectStream(stream);
        this._maybeShowInput();
    }

    _maybeShowInput() {
        // only show input widgets if any application is recording audio
        let showInput = false;
        if (this._stream) {
            // skip gnome-volume-control and pavucontrol which appear
            // as recording because they show the input level
            let skippedApps = [
                'org.gnome.VolumeControl',
                'org.PulseAudio.pavucontrol',
            ];

            showInput = this._control.get_source_outputs().some(output => {
                return !skippedApps.includes(output.get_application_id());
            });
        }

        this._showInput = showInput;
        this._updateVisibility();
    }

    _shouldBeVisible() {
        return !this._forceInvisible && 
         super._shouldBeVisible() && (this._showInput || this._showInputSlider);
    }

    _updateVisibility() {
        let old_state_visible = this.item.visible;
        let visible = this._shouldBeVisible();

        if(old_state_visible != visible){
            this.item.visible = visible;
        } else {
            this.item.notify('visible');
        }
    }
};

var VolumeMenu = class extends PopupMenu.PopupMenuSection {
    constructor(control) {
        super();

        this.hasHeadphones = false;

        this._control = control;
        this._control.connect('state-changed', this._onControlStateChanged.bind(this));
        this._control.connect('default-sink-changed', this._readOutput.bind(this));
        this._control.connect('default-source-changed', this._readInput.bind(this));

        this._output = new OutputStreamSlider(this._control);
        this._output.connect('stream-updated', () => {
            this.emit('output-icon-changed');
        });
        this.addMenuItem(this._output.item);

        this._input = new InputStreamSlider(this._control);
        this._input.item.connect('notify::visible', () => {
            this.emit('input-visible-changed');
        });
        this._input.connect('stream-updated', () => {
            this.emit('input-icon-changed');
        });
        this.addMenuItem(this._input.item);

        this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._onControlStateChanged();
    }

    scroll(type, event) {
        return type === VolumeType.INPUT
            ? this._input.scroll(event)
            : this._output.scroll(event);
    }

    _onControlStateChanged() {
        if (this._control.get_state() == Gvc.MixerControlState.READY) {
            this._readInput();
            this._readOutput();
        } else {
            this.emit('output-icon-changed');
        }
    }

    _readOutput() {
        this._output.stream = this._control.get_default_sink();
    }

    _readInput() {
        this._input.stream = this._control.get_default_source();
    }

    getIcon(type) {
        return type === VolumeType.INPUT
            ? this._input.getIcon()
            : this._output.getIcon();
    }

    getLevel(type) {
        return type === VolumeType.INPUT
            ? this._input.getLevel()
            : this._output.getLevel();
    }

    getMaxLevel(type) {
        return type === VolumeType.INPUT
            ? this._input.getMaxLevel()
            : this._output.getMaxLevel();
    }

    getInputVisible() {
        return this._input._stream != null && this._input._showInput;
    }
};