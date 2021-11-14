/*******************************************************************************
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later
 * version.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 * 
 * You should have received a copy of the GNU General Public License along with
 * this program. If not, see <http://www.gnu.org/licenses/>.
 * 
 * Original Author: Gopi Sankar Karmegam
 ******************************************************************************/
/* jshint moz:true */

const { Gio, GObject, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Lib = Me.imports.convenience;
const _d = Lib._log;
const SignalManager = Lib.SignalManager;

const Gettext = imports.gettext;
const _ = Gettext.gettext;

var HIDE_ON_SINGLE_DEVICE = "hide-on-single-device";
var HIDE_MENU_ICONS = "hide-menu-icons";
var SHOW_PROFILES = "show-profiles";
var PORT_SETTINGS = "ports-settings";
var SHOW_INPUT_SLIDER = "show-input-slider";
var SHOW_INPUT_DEVICES = "show-input-devices";
var SHOW_OUTPUT_DEVICES = "show-output-devices";
var ENABLE_LOG = "enable-log";
var NEW_PROFILE_ID_DEPRECATED = "new-profile-indentification";
var NEW_PROFILE_ID = "new-profile-identification";
var EXPAND_VOL_MENU = "expand-volume-menu";
var CANNOT_ACTIVATE_HIDDEN_DEVICE = "cannot-activate-hidden-device";
var OMIT_DEVICE_ORIGIN = "omit-device-origins";
var INTEGRATE_WITH_SLIDER = "integrate-with-slider";

var ICON_THEME = "icon-theme";
var ICON_THEME_COLORED = "colored";
var ICON_THEME_MONOCHROME = "monochrome";
var ICON_THEME_NONE = "none";

var DISPLAY_OPTIONS = { SHOW_ALWAYS: 1, HIDE_ALWAYS: 2, DEFAULT: 3, INITIAL: -1 };

const PORT_SETTINGS_VERSION = 3;

function init() {
    ExtensionUtils.initTranslations();
}

function getPortsFromSettings(_settings) {
    //_d(_settings.get_string(PORT_SETTINGS));
    let obj = JSON.parse(_settings.get_string(PORT_SETTINGS));
    let currentSettingsVersion = PORT_SETTINGS_VERSION;
    if (Array.isArray(obj)) {
        currentSettingsVersion = 1;
    }
    else {
        currentSettingsVersion = obj.version;
    }

    if (currentSettingsVersion < PORT_SETTINGS_VERSION) {
        obj = migratePortSettings(currentSettingsVersion, obj, _settings);
    }
    return obj.ports;
}

function setPortsSettings(ports, _settings) {
    let settingsObj = { "version": PORT_SETTINGS_VERSION };
    settingsObj.ports = ports;
    //_d(JSON.stringify(settingsObj));
    _settings.set_string(PORT_SETTINGS, JSON.stringify(settingsObj));
    return settingsObj;
}

function getPortDisplayName(port) {
    return `${port.human_name} - ${port.card_description}`;
}

function migratePortSettings(currVersion, currSettings, _settings) {
    let ports = [];
    let _lPorts = Lib.getPorts(true).slice();
    switch (currVersion) {
        case 1:
            for (let port of currSettings) {
                for (var i = 0; i < _lPorts.length; i++) {
                    let _lPort = _lPorts[i];
                    if (port.human_name == _lPort.human_name && port.name == _lPort.name) {
                        port.card_name = _lPort.card_name;
                        port.card_description = _lPort.card_description;
                        port.display_name = getPortDisplayName(_lPort);
                        _lPorts.splice(i, 1);
                        ports.push(port);
                        break;
                    }
                }
            }
            break;

        case 2:
            for (let port of currSettings.ports) {
                for (var i = 0; i < _lPorts.length; i++) {
                    let _lPort = _lPorts[i];
                    if (port.human_name == _lPort.human_name && port.name == _lPort.name && port.card_name == _lPort.card_name) {
                        port.card_description = _lPort.card_description;
                        _lPorts.splice(i, 1);
                        ports.push(port);
                        break;
                    }
                }
            }
            break;
    }
    return setPortsSettings(ports, _settings);
}

const SDCSettingsWidget = new GObject.Class({
    Name: "SDC.Prefs.Widget",
    GTypeName: "SDCSettingsWidget",
    Extends: Gtk.Box,

    _init: function(params) {
        this.parent(params);
        this.orientation = Gtk.Orientation.VERTICAL;
        this.spacing = 0;
        let uiFileSuffix = "";

        if (Gtk.get_major_version() >= "4") {
            uiFileSuffix = "40";
            this.__addFn = this.append;
            this.__showFn = this.show;
        }
        else {
            this.__addFn = x => this.pack_start(x, true, true, 0);
            this.__showFn = this.show_all;
        }
        // creates the settings
        this._settings = ExtensionUtils.getSettings();

        Lib.setLog(this._settings.get_boolean(ENABLE_LOG));

        // creates the ui builder and add the main resource file
        let uiFilePath = Me.path + "/ui/prefs-dialog" + uiFileSuffix + ".glade";
        let builder = new Gtk.Builder();
        builder.set_translation_domain("sound-output-device-chooser");

        if (builder.add_from_file(uiFilePath) == 0) {
            _d("JS LOG: could not load the ui file: %s".format(uiFilePath));
            let label = new Gtk.Label({
                label: _("Could not load the preferences UI file"),
                vexpand: true
            });
            this.__addFn(label);
        } else {
            _d("JS LOG:_UI file receive and load: " + uiFilePath);

            let mainContainer = builder.get_object("main-container");

            this.__addFn(mainContainer);

            this._signalManager = new SignalManager();

            let showProfileSwitch = builder.get_object(SHOW_PROFILES);
            let volMenuSwitch = builder.get_object(EXPAND_VOL_MENU);
            let singleDeviceSwitch = builder.get_object(HIDE_ON_SINGLE_DEVICE);
            let showInputSliderSwitch = builder.get_object(SHOW_INPUT_SLIDER);
            let showInputDevicesSwitch = builder.get_object(SHOW_INPUT_DEVICES);
            let showOutputDevicesSwitch = builder.get_object(SHOW_OUTPUT_DEVICES);
            let hideMenuIconsSwitch = builder.get_object(HIDE_MENU_ICONS);
            let iconThemeCombo = builder.get_object(ICON_THEME);
            let logSwitch = builder.get_object(ENABLE_LOG);
            let newProfileIdSwitch = builder.get_object(NEW_PROFILE_ID);
            let cantActHiddSwitch = builder.get_object(CANNOT_ACTIVATE_HIDDEN_DEVICE);
            let omitDeviceOrigin = builder.get_object(OMIT_DEVICE_ORIGIN);
            let integrateWithSlider = builder.get_object(INTEGRATE_WITH_SLIDER);

            this._settings.bind(HIDE_ON_SINGLE_DEVICE, singleDeviceSwitch, "active", Gio.SettingsBindFlags.DEFAULT);
            this._settings.bind(SHOW_PROFILES, showProfileSwitch, "active", Gio.SettingsBindFlags.DEFAULT);
            this._settings.bind(EXPAND_VOL_MENU, volMenuSwitch, "active", Gio.SettingsBindFlags.DEFAULT);
            this._settings.bind(SHOW_INPUT_SLIDER, showInputSliderSwitch, "active", Gio.SettingsBindFlags.DEFAULT);
            this._settings.bind(SHOW_INPUT_DEVICES, showInputDevicesSwitch, "active", Gio.SettingsBindFlags.DEFAULT);
            this._settings.bind(SHOW_OUTPUT_DEVICES, showOutputDevicesSwitch, "active", Gio.SettingsBindFlags.DEFAULT);
            this._settings.bind(HIDE_MENU_ICONS, hideMenuIconsSwitch, "active", Gio.SettingsBindFlags.DEFAULT);
            this._settings.bind(ENABLE_LOG, logSwitch, "active", Gio.SettingsBindFlags.DEFAULT);
            this._settings.bind(NEW_PROFILE_ID, newProfileIdSwitch, "active", Gio.SettingsBindFlags.DEFAULT);
            this._settings.bind(CANNOT_ACTIVATE_HIDDEN_DEVICE, cantActHiddSwitch, "active", Gio.SettingsBindFlags.DEFAULT);
            this._settings.bind(OMIT_DEVICE_ORIGIN, omitDeviceOrigin, "active", Gio.SettingsBindFlags.DEFAULT);
            this._settings.bind(INTEGRATE_WITH_SLIDER, integrateWithSlider, "active", Gio.SettingsBindFlags.DEFAULT);
            this._settings.bind(ICON_THEME, iconThemeCombo, "active-id", Gio.SettingsBindFlags.DEFAULT);

            //Show always is not working always, hidden in the UI directly
            let showAlwaysToggleRender = builder.get_object("ShowAlwaysToggleRender");
            let hideAlwaysToggleRender = builder.get_object("HideAlwaysToggleRender");
            let showActiveToggleRender = builder.get_object("ShowActiveToggleRender");

            this._signalManager.addSignal(showAlwaysToggleRender, "toggled", this._showAlwaysToggleRenderCallback.bind(this));
            this._signalManager.addSignal(hideAlwaysToggleRender, "toggled", this._hideAlwaysToggleRenderCallback.bind(this));
            this._signalManager.addSignal(showActiveToggleRender, "toggled", this._showActiveToggleRenderCallback.bind(this));

            this._portsStore = builder.get_object("ports-store");

            this._populatePorts();
            this._restorePortsFromSettings();
        }
    },

    _populatePorts: function() {
        let ports = Lib.getPorts(true);
        ports.sort((a, b) => (b.direction.localeCompare(a.direction)) || getPortDisplayName(a).localeCompare(getPortDisplayName(b))).forEach(port => {
            this._portsStore.set(this._portsStore.append(), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                [port.human_name, false, false, true, port.name, 3, port.card_name, port.card_description, getPortDisplayName(port), port.direction]);
        });
    },

    _showAlwaysToggleRenderCallback: function(widget, path) {
        //this._toggleCallback(widget, path, 1, [2, 3]);
        this._toggleCallback(widget, path, DISPLAY_OPTIONS.SHOW_ALWAYS, [2, 3]);
    },

    _hideAlwaysToggleRenderCallback: function(widget, path) {
        //this._toggleCallback(widget, path, 2, [1, 3]);
        this._toggleCallback(widget, path, DISPLAY_OPTIONS.HIDE_ALWAYS, [1, 3]);
    },

    _showActiveToggleRenderCallback: function(widget, path) {
        //this._toggleCallback(widget, path, 3, [1, 2]);
        this._toggleCallback(widget, path, DISPLAY_OPTIONS.DEFAULT, [1, 2]);
    },

    _toggleCallback: function(widget, path, activeCol, inactiveCols) {
        let active = !widget.active;
        if (!active) {
            return;
        }
        let [success, iter] = this._portsStore.get_iter_from_string(path);
        if (!success) {
            return;
        }
        /*Dont support non-pci cards for show always*/
        let card_name = this._portsStore.get_value(iter, 6);
        if (!/\.pci-/.exec(card_name) && activeCol == 1) {
            //this._toggleCallback(widget, path, 3, [1, 2]);
            this._toggleCallback(widget, path, DISPLAY_OPTIONS.DEFAULT, [1, 2]);
        }
        else {
            this._portsStore.set_value(iter, activeCol, active);
            this._portsStore.set_value(iter, 5, activeCol);
            for (let col of inactiveCols) {
                this._portsStore.set_value(iter, col, !active);
            }
            this._commitSettings();
        }
    },

    _commitSettings: function() {
        let ports = [];
        let [success, iter] = this._portsStore.get_iter_first();
        while (iter && success) {
            if (!this._portsStore.get_value(iter, 3)) {
                let display_option = this._portsStore.get_value(iter, 5);
                //if (display_option != 3) {//Dont store default value
                if (display_option != DISPLAY_OPTIONS.DEFAULT) {//Dont store default value
                    ports.push({
                        human_name: this._portsStore.get_value(iter, 0),
                        name: this._portsStore.get_value(iter, 4),
                        display_option: display_option,
                        card_name: this._portsStore.get_value(iter, 6),
                        card_description: this._portsStore.get_value(iter, 7),
                        display_name: this._portsStore.get_value(iter, 8)
                    });
                }
            }
            success = this._portsStore.iter_next(iter);
        }
        setPortsSettings(ports, this._settings);
    },

    _restorePortsFromSettings: function() {
        let ports = getPortsFromSettings(this._settings);

        let found;
        for (let port of ports) {
            found = false;
            if (!port || !port.human_name || !port.name) {
                continue;
            }

            let [success, iter] = this._portsStore.get_iter_first();

            while (iter && success) {
                let human_name = this._portsStore.get_value(iter, 0);
                let name = this._portsStore.get_value(iter, 4);
                let card_name = this._portsStore.get_value(iter, 6);

                if (port.name == name && port.human_name == human_name && port.card_name == card_name) {
                    this._portsStore.set_value(iter, 3, false);
                    this._portsStore.set_value(iter, port.display_option, true);
                    this._portsStore.set_value(iter, 5, port.display_option);
                    found = true;
                    break;
                }
                success = this._portsStore.iter_next(iter);
            }

            if (!found) {
                iter = this._portsStore.append();
                this._portsStore.set(iter, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                    [port.human_name, false, false, false, port.name, port.display_option, port.card_name, port.card_description, port.display_name, ""]);
                this._portsStore.set_value(iter, port.display_option, true);
            }
        }
    }
});


function buildPrefsWidget() {
    let _settingsWidget = new SDCSettingsWidget();
    _settingsWidget.__showFn();

    return _settingsWidget;
}
