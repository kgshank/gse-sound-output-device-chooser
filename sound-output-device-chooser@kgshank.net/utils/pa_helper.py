#!/usr/bin/python
###############################################################################
 # This program is free software: you can redistribute it and/or modify it under
 # the terms of the GNU General Public License as published by the Free Software
 # Foundation, either version 3 of the License, or (at your option) any later
 # version.
 #
 # This program is distributed in the hope that it will be useful, but WITHOUT
 # ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 # FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 # details.
 #
 # You should have received a copy of the GNU General Public License along with
 # this program. If not, see <http://www.gnu.org/licenses/>.
 #
 # Original Author: Gopi Sankar Karmegam
 ##############################################################################

import libpulse_introspect as pa
import sys
from ctypes import c_int,byref, c_char_p, cast
import time
from json import dumps

class PAHelper():
    
    _error = {
        'success': False,
        'error': None,
    }
    _card_op_done = None
    _pa_state = pa.PA_CONTEXT_UNCONNECTED


    def __init__(self):
        self._ports = []
        self._cards = {}
        self.mainloop = pa.pa_mainloop_new()
        self._context = pa.pa_context_new( pa.pa_mainloop_get_api(self.mainloop), b'PAHelper')
        self._pa_context_notify_cb_t = pa.pa_context_notify_cb_t(self.pa_context_notify_cb_t)
        pa.pa_context_set_state_callback(self._context,   self._pa_context_notify_cb_t , None)
        pa.pa_context_connect(self._context, None, 0, None)
        self._opn_completed = False

    def print_card_info(self, index = None):
        operation = None
        retVal = c_int()
        counter = 0

        while counter < 10000 and self._opn_completed == False:
            counter += 1
            if self._pa_state == pa.PA_CONTEXT_READY and operation == None:
                self._pa_card_info_cb_t = pa.pa_card_info_cb_t(self.pa_card_info_cb)
#                 operation = pa.pa_context_get_card_info_by_index(self._context,
#                             index, self._pa_card_info_cb_t , None)
                operation = pa.pa_context_get_card_info_list(self._context,
                             self._pa_card_info_cb_t , None)

            pa.pa_mainloop_iterate(self.mainloop, 0, byref(retVal))
        print(dumps({'cards': self._cards, 'ports':self._ports}, indent = 5))
        
        try:    
            if operation:
                pa.pa_operation_unref(operation)
                    
            pa.pa_context_disconnect(self._context)
            pa.pa_context_unref(self._context)
            pa.pa_mainloop_free(self.mainloop)
        except:
            pass

    def pa_card_info_cb(self, context, card_info, eol, whatever):
        
        if not card_info or not card_info[0]:
            return

        card = card_info[0]
        #print (card.index)
        card_obj = {}
        card_obj['index'] = str(card.index)
        self._cards[card.index] = card_obj
        card_obj['profiles'] = [] 
        
        card_name = cast(pa.pa_proplist_gets(card.proplist,c_char_p(b'alsa.card_name')),c_char_p)
        card_obj['alsa_name'] = card_name.value.decode('utf8') if card_name else ''
        description = cast(pa.pa_proplist_gets(card.proplist,c_char_p(b'device.description')),c_char_p)
        card_obj['card_description'] = description.value.decode('utf8') if description else ''
        
        card_obj['name'] = card.name.decode('utf8') if card.name else ''
        for k in range(0, card.n_profiles):
            if(card.profiles2[k]):
                profile = card.profiles2[k].contents 
                pobj = {}
                pobj['name'] = profile.name.decode('utf8') if profile.name  else ''
                pobj['human_name'] = profile.description.decode('utf8') if profile.description  else ''
                pobj['available'] = profile.available
                card_obj['profiles'].append(pobj)
                
        card_obj['ports'] = []        
        for i in range(0, card.n_ports):
            port = card.ports[i].contents
#             print ("Port name "+ str(port.name))
            obj = {}
            obj['name'] = port.name.decode('utf8') if port.name  else ''
            obj['human_name'] = port.description.decode('utf8') if port.description  else ''
            obj['direction'] =  'Output' if (port.direction &  pa.PA_DIRECTION_OUTPUT) else  'Input'
            obj['available'] = port.available
            obj['n_profiles'] = port.n_profiles
            obj['profiles'] = []
            obj['card_name'] = card_obj['name']
            obj['card_description'] = card_obj['card_description']
            for j in range(0, port.n_profiles):
                if(port.profiles2[j]):
                    profile = port.profiles2[j].contents 
#                     pobj = {}
#                     pobj['name'] = profile.name.decode('utf8') if profile.name  else ''
#                     pobj['human_name'] = profile.description.decode('utf8') if profile.description  else ''
#                     pobj['available'] = profile.available
#                     obj['profiles'].append(pobj)
                    if profile.name:
                        obj['profiles'].append(profile.name.decode('utf8'))

            self._ports.append(obj)
            card_obj['ports'].append(obj)
        
        
        
        self._opn_completed = True


    def pa_context_notify_cb_t(self, context, userdata):
        try:
            self._pa_state = pa.pa_context_get_state(context)
            
        except Exception:
            self._pa_state = pa.PA_CONTEXT_FAILED
        

PAHelper().print_card_info()
            

