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
 * *****************************************************************************
 * Original Author: Gopi Sankar Karmegam
 ******************************************************************************/
/* jshint moz:true */

const ByteArray = imports.byteArray;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
const Prefs = Me.imports.prefs;

var DEBUG = false;

var logWrap;
if (log != undefined) {
    logWrap = log;
}
else {
    logWrap = global.log
}

/**
 * getSettings:
 * 
 * @schema: (optional): the GSettings schema id Builds and return a GSettings
 *          schema for
 * @schema, using schema files in extensions dir/schemas. If
 * @schema is not provided, it is taken from metadata["settings-schema"].
 */
function getSettings(schema) {
    // let extension = ExtensionUtils.getCurrentExtension();

    schema = schema || Me.metadata["settings-schema"];

    const GioSSS = Gio.SettingsSchemaSource;

    // check if this extension was built with "make zip-file", and thus
    // has the schema files in a sub-folder
    // otherwise assume that extension has been installed in the
    // same prefix as gnome-shell (and therefore schemas are available
    // in the standard folders)
    let schemaDir = Me.dir.get_child("schemas");
    let schemaSource;
    if (schemaDir.query_exists(null))
        schemaSource = GioSSS.new_from_directory(schemaDir.get_path(), GioSSS.get_default(), false);
    else
        schemaSource = GioSSS.get_default();

    let schemaObj = schemaSource.lookup(schema, true);
    if (!schemaObj)
        throw new Error("Schema " + schema + " could not be found for extension "
            + Me.metadata.uuid + ". Please check your installation.");

    let _settings = new Gio.Settings({ settings_schema: schemaObj });
    return _settings;
}

let cards;

function getCard(card_index) {
    if (!cards || Object.keys(cards).length == 0) {
        refreshCards();
    }
    return cards[card_index];
}

function getCardByName(card_name) {
    if (!cards || Object.keys(cards).length == 0) {
        refreshCards();
    }
    return Object.keys(cards).map((index) => cards[index]).find(({ name }) => name === card_name);
}

function getProfiles(control, uidevice) {
    let stream = control.lookup_stream_id(uidevice.get_stream_id());
    if (stream) {
        if (!cards || Object.keys(cards).length == 0 || !cards[stream.card_index]) {
            refreshCards();
        }

        if (cards && cards[stream.card_index]) {
            _log("Getting profile form stream id " + uidevice.port_name);
            let profiles;
            if ((profiles = getProfilesForPort(uidevice.port_name, cards[stream.card_index]))) {
                return profiles;
            }           
        }
    }
    else {
        /* Device is not active device, lets try match with port name */
        refreshCards();
        for(let card of Object.values(cards)) {
            let profiles;
            _log("Getting profile from cards " + uidevice.port_name + " for card id " + card.id);
            if ((profiles = getProfilesForPort(uidevice.port_name, card))) {
                return profiles;
            }
        }
    }

    return [];
}

let ports;
function getPorts(refresh) {
    if (!ports || ports.length == 0 || refresh) {
        refreshCards();
    }
    return ports;
}

function isCmdFound(cmd) {
    try {
        let [result, out, err, exit_code] = GLib.spawn_command_line_sync(cmd);
        return true;
    }
    catch (e) {
        _log("ERROR: " + cmd + " execution failed. " + e);
        return false;
    }
}

function refreshCards() {
    cards = {};
    ports = [];
    // if(_settings == null) {getSettings(Prefs.SETTINGS_SCHEMA);}
    let _settings = getSettings(Prefs.SETTINGS_SCHEMA);
    let error = false;
    let newProfLogic = _settings.get_boolean(Prefs.NEW_PROFILE_ID);
    if (newProfLogic) {
        _log("New logic");
        let pyLocation = Me.dir.get_child("utils/pa_helper.py").get_path();
        let pythonExec = ["python", "python3", "python2"].find(cmd => isCmdFound(cmd));
        if (!pythonExec) {
            _log("ERROR: Python not found. fallback to default mode");
            _settings.set_boolean(Prefs.NEW_PROFILE_ID, false);
            Gio.Settings.sync();
            newProfLogic = false;
        }
        else {
            try {
                _log("Python found." + pythonExec);
                let [result, out, err, exit_code] = GLib.spawn_command_line_sync(pythonExec + " " + pyLocation);
                // _log("result" + result +" out"+out + " exit_code" +
                // exit_code + "err" +err);
                if (result && !exit_code) {
                    if (out instanceof Uint8Array) {
                        out = ByteArray.toString(out);
                    }
                    let obj = JSON.parse(out);
                    cards = obj["cards"];
                    ports = obj["ports"];
                }
            }
            catch (e) {
                error = true;
                _log("ERROR: Python execution failed. fallback to default mode" + e);
                _settings.set_boolean(Prefs.NEW_PROFILE_ID, false);
                Gio.Settings.sync();
            }
        }
    }
    //error = true;
    if (!newProfLogic || error) {
        _log("Old logic");
        try {
            let env = GLib.get_environ();
            env = GLib.environ_setenv(env, "LANG", "C", true);
            let [result, out, err, exit_code] = GLib.spawn_sync(null, ["pactl", "list", "cards"], env, GLib.SpawnFlags.SEARCH_PATH, null);
            //_log(result+"--"+out+"--"+ err+"--"+ exit_code)
            if (result && !exit_code) {
                parseOutput(out);
            }
        }
        catch (e) {
            _log("ERROR: pactl execution failed. No ports/profiles will be displayed." + e);
        }
    }
    //_log(Array.isArray(cards));
    //_log(JSON.stringify(cards));
    //_log(Array.isArray(ports));
    //_log(JSON.stringify(ports));
}

function parseOutput(out) {
    let lines;
    if (out instanceof Uint8Array) {
        lines = ByteArray.toString(out).split("\n");
    } else {
        lines = out.toString().split("\n");
    }

    let cardIndex;
    let parseSection = "CARDS";
    let port;
    let matches;
    // _log("Unmatched line:" + out);
    while (lines.length > 0) {
        let line = lines.shift();

        if ((matches = /^Card\s#(\d+)$/.exec(line))) {
            cardIndex = matches[1];
            if (!cards[cardIndex]) {
                cards[cardIndex] = { "index": cardIndex, "profiles": [], "ports": [] };
            }
        }
        else if ((matches = /^\t*Name:\s+(.*?)$/.exec(line)) && cards[cardIndex]) {
            cards[cardIndex].name = matches[1];
            parseSection = "CARDS"
        }
        else if (line.match(/^\tProperties:$/) && parseSection == "CARDS") {
            parseSection = "PROPS";
        }
        else if (line.match(/^\t*Profiles:$/)) {
            parseSection = "PROFILES";
        }
        else if (line.match(/^\t*Ports:$/)) {
            parseSection = "PORTS";
        }
        else if (cards[cardIndex]) {
            switch (parseSection) {
                case "PROPS":
                    if ((matches = /alsa\.card_name\s+=\s+"(.*?)"/.exec(line))) {
                        cards[cardIndex].alsa_name = matches[1];
                    }
                    else if ((matches = /device\.description\s+=\s+"(.*?)"/.exec(line))) {
                        cards[cardIndex].card_description = matches[1];
                    }
                    break;
                case "PROFILES":
                    if ((matches = /.*?((?:output|input)[^+]*?):\s(.*?)\s\(sinks:/.exec(line))) {
                        cards[cardIndex].profiles.push({ "name": matches[1], "human_name": matches[2] });
                    }
                    break;
                case "PORTS":
                    if ((matches = /\t*(.*?):\s(.*)\s\(.*?priority:/.exec(line))) {
                        port = { "name": matches[1], "human_name": matches[2], "card_name": cards[cardIndex].name, "card_description": cards[cardIndex].card_description };
                        cards[cardIndex].ports.push(port);
                        ports.push(port);
                    }
                    else if (port && (matches = /\t*Part of profile\(s\):\s(.*)/.exec(line))) {
                        let profileStr = matches[1];
                        port.profiles = profileStr.split(", ");
                        port = null;
                    }
                    break;
            }
        }
    }
    if (ports) {
        ports.forEach(p => {
            p.direction = p.profiles.filter(pr => pr.indexOf("+input:") == -1).some(pr => (pr.indexOf("output:") >= 0)) ? "Output" : "Input";
        });
    }
}

var Signal = class Signal {

    constructor(signalSource, signalName, callback) {
        this._signalSource = signalSource;
        this._signalName = signalName;
        this._signalCallback = callback;
    }

    connect() {
        this._signalId = this._signalSource.connect(this._signalName, this._signalCallback);
    }

    disconnect() {
        if (this._signalId) {
            this._signalSource.disconnect(this._signalId);
            this._signalId = null;
        }
    }
}

var SignalManager = class SignalManager {
    constructor() {
        this._signalsBySource = new Map();
    }

    addSignal(signalSource, signalName, callback) {
        let obj = null;
        if (signalSource && signalName && callback) {
            obj = new Signal(signalSource, signalName, callback);
            obj.connect();

            if (!this._signalsBySource.has(signalSource)) {
                this._signalsBySource.set(signalSource, []);
            }
            this._signalsBySource.get(signalSource).push(obj)
            //_log(this._signalsBySource.get(signalSource).length + "Signal length");
        }
        return obj;
    }

    disconnectAll() {
        this._signalsBySource.forEach(signals => this._disconnectSignals(signals));
    }

    disconnectBySource(signalSource) {
        if (this._signalsBySource.has(signalSource)) {
            this._disconnectSignals(this._signalsBySource.get(signalSource));
        }
    }

    _disconnectSignals(signals) {
        while (signals.length) {
            var signal = signals.shift();
            signal.disconnect();
            signal = null;
        }
    }
}


function getProfilesForPort(portName, card) {
    if (card.ports) {
        let port = card.ports.find(port => (portName === port.name));
        if (port) {
            if (port.profiles) {
                return card.profiles.filter(profile => (profile.name.indexOf("+input:") == -1 && port.profiles.includes(profile.name)))
            }
        }
    }
    return null;
}

function setLog(value) {
    DEBUG = value;
}

function _log(msg) {
    if (DEBUG == true) {
        // global.log("SDC Debug: " + msg);
        logWrap("SDC Debug: " + msg);
    }
}

function dump(obj) {
    var propValue;
    for (var propName in obj) {
        try {
            propValue = obj[propName];
            _log(propName + "=" + propValue);
        }
        catch (e) { _log(propName + "!!!Error!!!"); }
    }
}
