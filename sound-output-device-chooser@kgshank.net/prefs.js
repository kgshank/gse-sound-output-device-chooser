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

const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Lib = Me.imports.convenience;
const SignalManager = Lib.SignalManager;

const Gettext = imports.gettext;
Gettext.bindtextdomain("sound-output-device-chooser", Me.path + '/locale');
const _ = Gettext.gettext;

var SETTINGS_SCHEMA = "org.gnome.shell.extensions.sound-output-device-chooser";
var HIDE_ON_SINGLE_DEVICE = "hide-on-single-device";
var HIDE_MENU_ICONS = "hide-menu-icons";
var SHOW_PROFILES = "show-profiles";
var PORT_SETTINGS = "ports-settings";
var SHOW_INPUT_SLIDER = "show-input-slider";
var SHOW_INPUT_DEVICES = "show-input-devices";
var SHOW_OUTPUT_DEVICES = "show-output-devices";
var ENABLE_LOG = "enable-log";
var NEW_PROFILE_ID = "new-profile-indentification";
var EXPAND_VOL_MENU = "expand-volume-menu";

var ICON_THEME = "icon-theme";
var ICON_THEME_COLORED = "colored";
var ICON_THEME_MONOCHROME = "monochrome";
var ICON_THEME_NONE = "none";

function init(){}


const SDCSettingsWidget = new GObject.Class({
    Name: 'SDC.Prefs.Widget',
    GTypeName: 'SDCSettingsWidget',
    Extends: Gtk.Box,

    _init: function(params) {
        this.parent(params);
        this.orientation = Gtk.Orientation.VERTICAL;
        this.spacing = 0;

        // creates the settings
        this._settings = Lib.getSettings(SETTINGS_SCHEMA);

        Lib.setLog(this._settings.get_boolean(ENABLE_LOG)); 

        // creates the ui builder and add the main resource file
        let uiFilePath = Me.path + "/ui/prefs-dialog.gtkbuilder";
        let builder = new Gtk.Builder();
	builder.set_translation_domain('sound-output-device-chooser');

        if (builder.add_from_file(uiFilePath) == 0) {
            Lib.log("JS LOG: could not load the ui file: %s".format(uiFilePath));

            let label = new Gtk.Label({
                label: _("Could not load the preferences UI file"),
                vexpand: true
            });

            this.pack_start(label, true, true, 0);
        } else {
            Lib.log('JS LOG:_UI file receive and load: '+uiFilePath);

            let mainContainer = builder.get_object("main-container");

            this.pack_start(mainContainer, true, true, 0);

            this._signalManager = new SignalManager();

            let showProfileSwitch = builder.get_object("show-profile");
            let volMenuSwitch = builder.get_object(EXPAND_VOL_MENU);
            let singleDeviceSwitch = builder.get_object("single-device");
            let showInputSliderSwitch = builder.get_object("show-input-slider");
            let showInputDevicesSwitch = builder.get_object("show-input-devices");
            let showOutputDevicesSwitch = builder.get_object("show-output-devices");
            let hideMenuIconsSwitch = builder.get_object("hide-menu-icons");
            let iconThemeCombo = builder.get_object("icon-theme");
            let logSwitch = builder.get_object("enable-log");
            let newProfileIdSwitch = builder.get_object("new-profile-identification");

            this._settings.bind(HIDE_ON_SINGLE_DEVICE, singleDeviceSwitch, "active", Gio.SettingsBindFlags.DEFAULT);
            this._settings.bind(SHOW_PROFILES, showProfileSwitch, "active", Gio.SettingsBindFlags.DEFAULT);
            this._settings.bind(EXPAND_VOL_MENU, volMenuSwitch, "active", Gio.SettingsBindFlags.DEFAULT);
            this._settings.bind(SHOW_INPUT_SLIDER, showInputSliderSwitch, "active", Gio.SettingsBindFlags.DEFAULT);
            this._settings.bind(SHOW_INPUT_DEVICES, showInputDevicesSwitch, "active", Gio.SettingsBindFlags.DEFAULT);
            this._settings.bind(SHOW_OUTPUT_DEVICES, showOutputDevicesSwitch, "active", Gio.SettingsBindFlags.DEFAULT);
            this._settings.bind(HIDE_MENU_ICONS, hideMenuIconsSwitch, "active", Gio.SettingsBindFlags.DEFAULT);
            this._settings.bind(ENABLE_LOG, logSwitch, "active", Gio.SettingsBindFlags.DEFAULT);
            this._settings.bind(NEW_PROFILE_ID, newProfileIdSwitch, "active", Gio.SettingsBindFlags.DEFAULT);
            this._settings.bind(ICON_THEME, iconThemeCombo, "active-id", Gio.SettingsBindFlags.DEFAULT);


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

    _populatePorts: function (){
        let ports = Lib.getPorts(true);
        for (let port of ports)
        {
            this._portsStore.set(this._portsStore.append(),[0,1,2,3,4,5],[port.human_name, false, false, true, port.name,3]);
        }
    },

    _showAlwaysToggleRenderCallback: function(widget, path) {
        this._toggleCallback(widget, path, 1, [2, 3]);
    },

    _hideAlwaysToggleRenderCallback: function(widget, path) {
        this._toggleCallback(widget, path, 2, [1, 3]);
    },

    _showActiveToggleRenderCallback: function(widget, path) {
        this._toggleCallback(widget, path, 3, [1, 2]);
    },

    _toggleCallback: function(widget, path, activeCol, inactiveCols) {
        let active = !widget.active;
        if(!active)
        {
            return;
        }
        let [success, iter] = this._portsStore.get_iter_from_string(path);
        if (!success) {
            return;
        }
        this._portsStore.set_value(iter, activeCol, active);
        this._portsStore.set_value(iter, 5, activeCol);
        for (let col of inactiveCols)
        {
            this._portsStore.set_value(iter, col, !active);
        }
        this._commitSettings();
    },

    _commitSettings: function() {
        let ports = [];
        let [success, iter] = this._portsStore.get_iter_first();

        while (iter && success) {
            if(!this._portsStore.get_value(iter,3)) {
                ports.push({
                    human_name: this._portsStore.get_value(iter, 0),
                    name: this._portsStore.get_value(iter, 4),
                    display_option: this._portsStore.get_value(iter, 5)
                });
            }
            success = this._portsStore.iter_next(iter);
        }

        this._settings.set_string(PORT_SETTINGS, JSON.stringify(ports));
    },

    _restorePortsFromSettings: function() {
        let ports = JSON.parse(this._settings.get_string(PORT_SETTINGS));

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

                if(port.name == name && port.human_name == human_name) {
                    this._portsStore.set_value(iter, 3, false);
                    this._portsStore.set_value(iter, port.display_option, true);
                    this._portsStore.set_value(iter, 5, port.display_option);
                    found = true;
                    break;
                }
                success = this._portsStore.iter_next(iter);
            }

            if(!found){
                iter = this._portsStore.append();
                this._portsStore.set(iter, [0,1,2,3,4,5],
                        [port.human_name, false, false, false, port.name,port.display_option]);
                this._portsStore.set_value(iter, port.display_option, true);
            }
        }
    }
});


function buildPrefsWidget() {
    let _settingsWidget = new SDCSettingsWidget();
    _settingsWidget.show_all();

    return _settingsWidget;
}
