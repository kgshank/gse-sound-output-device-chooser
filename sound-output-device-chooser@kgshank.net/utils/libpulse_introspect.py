# This file is generated using clang2py script. The following files are used
# '/usr/include/pulse/introspect.h' '/usr/include/pulse/mainloop.h' '/usr/include/pulse/context.h' 
# Refer additional licensing requirements for the files included
# sample commands used
# python3 /usr/bin/clang2py  --clang-args="-I/usr/include/clang/6.0/include -I/usr/include/pulse" -l /usr/lib/libpulse.so '/usr/include/pulse/introspect.h' '/usr/include/pulse/mainloop.h' '/usr/include/pulse/proplist.h'  
# python3 /usr/local/bin/clang2py  --clang-args="-I/usr/include/clang/6.0/include -I/usr/include/pulse" -l /usr/lib/x86_64-linux-gnu/libpulse.so '/usr/include/pulse/introspect.h' '/usr/include/pulse/mainloop.h' 
# python3 /usr/local/bin/clang2py  --clang-args="-I/usr/include/clang/6.0/include -I/usr/include/pulse" -l /usr/lib/x86_64-linux-gnu/libpulse.so '/usr/include/pulse/context.h' 
################################################################################
#  # This program is free software: you can redistribute it and/or modify it under
#  # the terms of the GNU General Public License as published by the Free Software
#  # Foundation, either version 3 of the License, or (at your option) any later
#  # version.
#  #
#  # This program is distributed in the hope that it will be useful, but WITHOUT
#  # ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
#  # FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
#  # details.
#  #
#  # You should have received a copy of the GNU General Public License along with
#  # this program. If not, see <http://www.gnu.org/licenses/>.
#  #
#  # Original Author: Gopi Sankar Karmegam
# ##############################################################################
# -#- coding: utf-8 -#-
#
# TARGET arch is: ['-I/usr/include/clang/6.0/include', '-I/usr/include/pulse']
# WORD_SIZE is: 8
# POINTER_SIZE is: 8
# LONGDOUBLE_SIZE is: 16
#

# Updated to determine libpulse.so location
import ctypes
from ctypes.util import find_library

c_int128 = ctypes.c_ubyte*16
c_uint128 = c_int128
void = None
if ctypes.sizeof(ctypes.c_longdouble) == 16:
    c_long_double_t = ctypes.c_longdouble
else:
    c_long_double_t = ctypes.c_ubyte*16

# if local wordsize is same as target, keep ctypes pointer function.
if ctypes.sizeof(ctypes.c_void_p) == 8:
    POINTER_T = ctypes.POINTER
else:
    # required to access _ctypes
    import _ctypes
    # Emulate a pointer class using the approriate c_int32/c_int64 type
    # The new class should have :
    # ['__module__', 'from_param', '_type_', '__dict__', '__weakref__', '__doc__']
    # but the class should be submitted to a unique instance for each base type
    # to that if A == B, POINTER_T(A) == POINTER_T(B)
    ctypes._pointer_t_type_cache = {}
    def POINTER_T(pointee):
        # a pointer should have the same length as LONG
        fake_ptr_base_type = ctypes.c_uint64 
        # specific case for c_void_p
        if pointee is None: # VOID pointer type. c_void_p.
            pointee = type(None) # ctypes.c_void_p # ctypes.c_ulong
            clsname = 'c_void'
        else:
            clsname = pointee.__name__
        if clsname in ctypes._pointer_t_type_cache:
            return ctypes._pointer_t_type_cache[clsname]
        # make template
        class _T(_ctypes._SimpleCData,):
            _type_ = 'L'
            _subtype_ = pointee
            def _sub_addr_(self):
                return self.value
            def __repr__(self):
                return '%s(%d)'%(clsname, self.value)
            def contents(self):
                raise TypeError('This is not a ctypes pointer.')
            def __init__(self, **args):
                raise TypeError('This is not a ctypes pointer. It is not instanciable.')
        _class = type('LP_%d_%s'%(8, clsname), (_T,),{}) 
        ctypes._pointer_t_type_cache[clsname] = _class
        return _class

_libraries = {}

libpulse_library_name = find_library('pulse')
if libpulse_library_name is None:
    raise Exception('No libpulse.so library found!')

try:
    _libraries['libpulse.so'] = ctypes.cdll.LoadLibrary(libpulse_library_name)
except OSError:
    raise Exception('Cannot load libpulse.so library!')


uint32_t = ctypes.c_uint32

size_t = ctypes.c_uint64
class struct_pa_context(ctypes.Structure):
    pass

pa_context = struct_pa_context
pa_context_notify_cb_t = ctypes.CFUNCTYPE(None, POINTER_T(struct_pa_context), POINTER_T(None))
pa_context_success_cb_t = POINTER_T(ctypes.CFUNCTYPE(None, POINTER_T(struct_pa_context), ctypes.c_int32, POINTER_T(None)))

class struct_pa_proplist(ctypes.Structure):
    pass

pa_context_event_cb_t = POINTER_T(ctypes.CFUNCTYPE(None, POINTER_T(struct_pa_context), ctypes.c_char_p, POINTER_T(struct_pa_proplist), POINTER_T(None)))
class struct_pa_mainloop_api(ctypes.Structure):
    pass

pa_context_new = _libraries['libpulse.so'] .pa_context_new
pa_context_new.restype = POINTER_T(struct_pa_context)
pa_context_new.argtypes = [POINTER_T(struct_pa_mainloop_api), ctypes.c_char_p]

# pa_context_new_with_proplist = _libraries['libpulse.so'] .pa_context_new_with_proplist
# pa_context_new_with_proplist.restype = POINTER_T(struct_pa_context)
# pa_context_new_with_proplist.argtypes = [POINTER_T(struct_pa_mainloop_api), ctypes.c_char_p, POINTER_T(struct_pa_proplist)]

pa_context_unref = _libraries['libpulse.so'] .pa_context_unref
pa_context_unref.restype = None
pa_context_unref.argtypes = [POINTER_T(struct_pa_context)]

# pa_context_ref = _libraries['libpulse.so'] .pa_context_ref
# pa_context_ref.restype = POINTER_T(struct_pa_context)
# pa_context_ref.argtypes = [POINTER_T(struct_pa_context)]

pa_context_set_state_callback = _libraries['libpulse.so'] .pa_context_set_state_callback
pa_context_set_state_callback.restype = None
pa_context_set_state_callback.argtypes = [POINTER_T(struct_pa_context), pa_context_notify_cb_t, POINTER_T(None)]
# 
# pa_context_set_event_callback = _libraries['libpulse.so'] .pa_context_set_event_callback
# pa_context_set_event_callback.restype = None
# pa_context_set_event_callback.argtypes = [POINTER_T(struct_pa_context), pa_context_event_cb_t, POINTER_T(None)]
# 
# pa_context_errno = _libraries['libpulse.so'] .pa_context_errno
# pa_context_errno.restype = ctypes.c_int32
# pa_context_errno.argtypes = [POINTER_T(struct_pa_context)]
# 
# pa_context_is_pending = _libraries['libpulse.so'] .pa_context_is_pending
# pa_context_is_pending.restype = ctypes.c_int32
# pa_context_is_pending.argtypes = [POINTER_T(struct_pa_context)]



# values for enumeration 'pa_context_state'
pa_context_state__enumvalues = {
    0: 'PA_CONTEXT_UNCONNECTED',
    1: 'PA_CONTEXT_CONNECTING',
    2: 'PA_CONTEXT_AUTHORIZING',
    3: 'PA_CONTEXT_SETTING_NAME',
    4: 'PA_CONTEXT_READY',
    5: 'PA_CONTEXT_FAILED',
    6: 'PA_CONTEXT_TERMINATED',
}

PA_CONTEXT_UNCONNECTED = 0
PA_CONTEXT_CONNECTING = 1
PA_CONTEXT_AUTHORIZING = 2
PA_CONTEXT_SETTING_NAME = 3
PA_CONTEXT_READY = 4
PA_CONTEXT_FAILED = 5
PA_CONTEXT_TERMINATED = 6

pa_context_state = ctypes.c_int # enum
pa_context_state_t = pa_context_state
pa_context_state_t__enumvalues = pa_context_state__enumvalues

pa_context_get_state = _libraries['libpulse.so'] .pa_context_get_state
pa_context_get_state.restype = pa_context_state_t
pa_context_get_state.argtypes = [POINTER_T(struct_pa_context)]

# values for enumeration 'pa_context_flags'
pa_context_flags__enumvalues = {
    0: 'PA_CONTEXT_NOFLAGS',
    1: 'PA_CONTEXT_NOAUTOSPAWN',
    2: 'PA_CONTEXT_NOFAIL',
}
PA_CONTEXT_NOFLAGS = 0
PA_CONTEXT_NOAUTOSPAWN = 1
PA_CONTEXT_NOFAIL = 2
pa_context_flags = ctypes.c_int # enum
pa_context_flags_t = pa_context_flags
pa_context_flags_t__enumvalues = pa_context_flags__enumvalues
class struct_pa_spawn_api(ctypes.Structure):
    pass

pa_context_connect = _libraries['libpulse.so'] .pa_context_connect
pa_context_connect.restype = ctypes.c_int32
pa_context_connect.argtypes = [POINTER_T(struct_pa_context), ctypes.c_char_p, pa_context_flags_t, POINTER_T(struct_pa_spawn_api)]
pa_context_disconnect = _libraries['libpulse.so'] .pa_context_disconnect
pa_context_disconnect.restype = None
pa_context_disconnect.argtypes = [POINTER_T(struct_pa_context)]

class struct_pa_operation(ctypes.Structure):
    pass

# pa_context_drain = _libraries['libpulse.so'] .pa_context_drain
# pa_context_drain.restype = POINTER_T(struct_pa_operation)
# pa_context_drain.argtypes = [POINTER_T(struct_pa_context), pa_context_notify_cb_t, POINTER_T(None)]
# pa_context_exit_daemon = _libraries['libpulse.so'] .pa_context_exit_daemon
# pa_context_exit_daemon.restype = POINTER_T(struct_pa_operation)
# pa_context_exit_daemon.argtypes = [POINTER_T(struct_pa_context), pa_context_success_cb_t, POINTER_T(None)]
# pa_context_set_default_sink = _libraries['libpulse.so'] .pa_context_set_default_sink
# pa_context_set_default_sink.restype = POINTER_T(struct_pa_operation)
# pa_context_set_default_sink.argtypes = [POINTER_T(struct_pa_context), ctypes.c_char_p, pa_context_success_cb_t, POINTER_T(None)]
# pa_context_set_default_source = _libraries['libpulse.so'] .pa_context_set_default_source
# pa_context_set_default_source.restype = POINTER_T(struct_pa_operation)
# pa_context_set_default_source.argtypes = [POINTER_T(struct_pa_context), ctypes.c_char_p, pa_context_success_cb_t, POINTER_T(None)]
# pa_context_is_local = _libraries['libpulse.so'] .pa_context_is_local
# pa_context_is_local.restype = ctypes.c_int32
# pa_context_is_local.argtypes = [POINTER_T(struct_pa_context)]
# pa_context_set_name = _libraries['libpulse.so'] .pa_context_set_name
# pa_context_set_name.restype = POINTER_T(struct_pa_operation)
# pa_context_set_name.argtypes = [POINTER_T(struct_pa_context), ctypes.c_char_p, pa_context_success_cb_t, POINTER_T(None)]
# pa_context_get_server = _libraries['libpulse.so'] .pa_context_get_server
# pa_context_get_server.restype = ctypes.c_char_p
# pa_context_get_server.argtypes = [POINTER_T(struct_pa_context)]

# pa_context_get_protocol_version = _libraries['libpulse.so'] .pa_context_get_protocol_version
# pa_context_get_protocol_version.restype = uint32_t
# pa_context_get_protocol_version.argtypes = [POINTER_T(struct_pa_context)]
# pa_context_get_server_protocol_version = _libraries['libpulse.so'] .pa_context_get_server_protocol_version
# pa_context_get_server_protocol_version.restype = uint32_t
# pa_context_get_server_protocol_version.argtypes = [POINTER_T(struct_pa_context)]
class struct_pa_card_profile_info(ctypes.Structure):
    _pack_ = True # source:False
    _fields_ = [
    ('name', ctypes.c_char_p),
    ('description', ctypes.c_char_p),
    ('n_sinks', ctypes.c_uint32),
    ('n_sources', ctypes.c_uint32),
    ('priority', ctypes.c_uint32),
    ('PADDING_0', ctypes.c_ubyte * 4),
     ]

pa_card_profile_info = struct_pa_card_profile_info
class struct_pa_card_profile_info2(ctypes.Structure):
    _pack_ = True # source:False
    _fields_ = [
    ('name', ctypes.c_char_p),
    ('description', ctypes.c_char_p),
    ('n_sinks', ctypes.c_uint32),
    ('n_sources', ctypes.c_uint32),
    ('priority', ctypes.c_uint32),
    ('available', ctypes.c_int32),
     ]

pa_card_profile_info2 = struct_pa_card_profile_info2
class struct_pa_card_port_info(ctypes.Structure):
    _pack_ = True # source:False
    _fields_ = [
    ('name', ctypes.c_char_p),
    ('description', ctypes.c_char_p),
    ('priority', ctypes.c_uint32),
    ('available', ctypes.c_int32),
    ('direction', ctypes.c_int32),
    ('n_profiles', ctypes.c_uint32),
    ('profiles', POINTER_T(POINTER_T(struct_pa_card_profile_info))),
    ('proplist', POINTER_T(struct_pa_proplist)),
    ('latency_offset', ctypes.c_int64),
    ('profiles2', POINTER_T(POINTER_T(struct_pa_card_profile_info2))),
     ]

pa_card_port_info = struct_pa_card_port_info
class struct_pa_card_info(ctypes.Structure):
    _pack_ = True # source:False
    _fields_ = [
    ('index', ctypes.c_uint32),
    ('PADDING_0', ctypes.c_ubyte * 4),
    ('name', ctypes.c_char_p),
    ('owner_module', ctypes.c_uint32),
    ('PADDING_1', ctypes.c_ubyte * 4),
    ('driver', ctypes.c_char_p),
    ('n_profiles', ctypes.c_uint32),
    ('PADDING_2', ctypes.c_ubyte * 4),
    ('profiles', POINTER_T(struct_pa_card_profile_info)),
    ('active_profile', POINTER_T(struct_pa_card_profile_info)),
    ('proplist', POINTER_T(struct_pa_proplist)),
    ('n_ports', ctypes.c_uint32),
    ('PADDING_3', ctypes.c_ubyte * 4),
    ('ports', POINTER_T(POINTER_T(struct_pa_card_port_info))),
    ('profiles2', POINTER_T(POINTER_T(struct_pa_card_profile_info2))),
    ('active_profile2', POINTER_T(struct_pa_card_profile_info2)),
     ]

pa_card_info = struct_pa_card_info
pa_card_info_cb_t = ctypes.CFUNCTYPE(None, POINTER_T(struct_pa_context), POINTER_T(struct_pa_card_info), ctypes.c_int32, POINTER_T(None))
pa_context_get_card_info_by_index = _libraries['libpulse.so'].pa_context_get_card_info_by_index
pa_context_get_card_info_by_index.restype = POINTER_T(struct_pa_operation)
pa_context_get_card_info_by_index.argtypes = [POINTER_T(struct_pa_context), uint32_t, pa_card_info_cb_t, POINTER_T(None)]


pa_context_get_card_info_list = _libraries['libpulse.so'].pa_context_get_card_info_list
pa_context_get_card_info_list.restype = POINTER_T(struct_pa_operation)
pa_context_get_card_info_list.argtypes = [POINTER_T(struct_pa_context), pa_card_info_cb_t, POINTER_T(None)]


# values for enumeration 'pa_update_mode'
# pa_update_mode__enumvalues = {
#     0: 'PA_UPDATE_SET',
#     1: 'PA_UPDATE_MERGE',
#     2: 'PA_UPDATE_REPLACE',
# }
# PA_UPDATE_SET = 0
# PA_UPDATE_MERGE = 1
# PA_UPDATE_REPLACE = 2
# pa_update_mode = ctypes.c_int # enum
# pa_update_mode_t = pa_update_mode
# pa_update_mode_t__enumvalues = pa_update_mode__enumvalues
# pa_context_proplist_update = _libraries['libpulse.so'] .pa_context_proplist_update
# pa_context_proplist_update.restype = POINTER_T(struct_pa_operation)
# pa_context_proplist_update.argtypes = [POINTER_T(struct_pa_context), pa_update_mode_t, POINTER_T(struct_pa_proplist), pa_context_success_cb_t, POINTER_T(None)]
# pa_context_proplist_remove = _libraries['libpulse.so'] .pa_context_proplist_remove
# pa_context_proplist_remove.restype = POINTER_T(struct_pa_operation)
# pa_context_proplist_remove.argtypes = [POINTER_T(struct_pa_context), ctypes.c_char_p * 0, pa_context_success_cb_t, POINTER_T(None)]
# pa_context_get_index = _libraries['libpulse.so'] .pa_context_get_index
# pa_context_get_index.restype = uint32_t
# pa_context_get_index.argtypes = [POINTER_T(struct_pa_context)]
class struct_pa_time_event(ctypes.Structure):
    pass

# pa_usec_t = ctypes.c_uint64
class struct_timeval(ctypes.Structure):
    pass
# 
# pa_time_event_cb_t = POINTER_T(ctypes.CFUNCTYPE(None, POINTER_T(struct_pa_mainloop_api), POINTER_T(struct_pa_time_event), POINTER_T(struct_timeval), POINTER_T(None)))
# pa_context_rttime_new = _libraries['libpulse.so'] .pa_context_rttime_new
# pa_context_rttime_new.restype = POINTER_T(struct_pa_time_event)
# pa_context_rttime_new.argtypes = [POINTER_T(struct_pa_context), pa_usec_t, pa_time_event_cb_t, POINTER_T(None)]
# pa_context_rttime_restart = _libraries['libpulse.so'] .pa_context_rttime_restart
# pa_context_rttime_restart.restype = None
# pa_context_rttime_restart.argtypes = [POINTER_T(struct_pa_context), POINTER_T(struct_pa_time_event), pa_usec_t]
class struct_pa_sample_spec(ctypes.Structure):
    pass

# pa_context_get_tile_size = _libraries['libpulse.so'] .pa_context_get_tile_size
# pa_context_get_tile_size.restype = size_t
# pa_context_get_tile_size.argtypes = [POINTER_T(struct_pa_context), POINTER_T(struct_pa_sample_spec)]
# pa_context_load_cookie_from_file = _libraries['libpulse.so'] .pa_context_load_cookie_from_file
# pa_context_load_cookie_from_file.restype = ctypes.c_int32
# pa_context_load_cookie_from_file.argtypes = [POINTER_T(struct_pa_context), ctypes.c_char_p]
# struct_pa_spawn_api._pack_ = True # source:False
# struct_pa_spawn_api._fields_ = [
#     ('prefork', POINTER_T(ctypes.CFUNCTYPE(None))),
#     ('postfork', POINTER_T(ctypes.CFUNCTYPE(None))),
#     ('atfork', POINTER_T(ctypes.CFUNCTYPE(None))),
# ]
# 
 
# values for enumeration 'pa_io_event_flags'
pa_io_event_flags__enumvalues = {
    0: 'PA_IO_EVENT_NULL',
    1: 'PA_IO_EVENT_INPUT',
    2: 'PA_IO_EVENT_OUTPUT',
    4: 'PA_IO_EVENT_HANGUP',
    8: 'PA_IO_EVENT_ERROR',
}
PA_IO_EVENT_NULL = 0
PA_IO_EVENT_INPUT = 1
PA_IO_EVENT_OUTPUT = 2
PA_IO_EVENT_HANGUP = 4
PA_IO_EVENT_ERROR = 8
pa_io_event_flags = ctypes.c_int # enum
class struct_pa_io_event(ctypes.Structure):
    pass
 
class struct_pa_defer_event(ctypes.Structure):
    pass

struct_pa_mainloop_api._pack_ = True # source:False
struct_pa_mainloop_api._fields_ = [
    ('userdata', POINTER_T(None)),
    ('io_new', POINTER_T(ctypes.CFUNCTYPE(POINTER_T(struct_pa_io_event), POINTER_T(struct_pa_mainloop_api), ctypes.c_int32, pa_io_event_flags, POINTER_T(ctypes.CFUNCTYPE(None, POINTER_T(struct_pa_mainloop_api), POINTER_T(struct_pa_io_event), ctypes.c_int32, pa_io_event_flags, POINTER_T(None))), POINTER_T(None)))),
    ('io_enable', POINTER_T(ctypes.CFUNCTYPE(None, POINTER_T(struct_pa_io_event), pa_io_event_flags))),
    ('io_free', POINTER_T(ctypes.CFUNCTYPE(None, POINTER_T(struct_pa_io_event)))),
    ('io_set_destroy', POINTER_T(ctypes.CFUNCTYPE(None, POINTER_T(struct_pa_io_event), POINTER_T(ctypes.CFUNCTYPE(None, POINTER_T(struct_pa_mainloop_api), POINTER_T(struct_pa_io_event), POINTER_T(None)))))),
    ('time_new', POINTER_T(ctypes.CFUNCTYPE(POINTER_T(struct_pa_time_event), POINTER_T(struct_pa_mainloop_api), POINTER_T(struct_timeval), POINTER_T(ctypes.CFUNCTYPE(None, POINTER_T(struct_pa_mainloop_api), POINTER_T(struct_pa_time_event), POINTER_T(struct_timeval), POINTER_T(None))), POINTER_T(None)))),
    ('time_restart', POINTER_T(ctypes.CFUNCTYPE(None, POINTER_T(struct_pa_time_event), POINTER_T(struct_timeval)))),
    ('time_free', POINTER_T(ctypes.CFUNCTYPE(None, POINTER_T(struct_pa_time_event)))),
    ('time_set_destroy', POINTER_T(ctypes.CFUNCTYPE(None, POINTER_T(struct_pa_time_event), POINTER_T(ctypes.CFUNCTYPE(None, POINTER_T(struct_pa_mainloop_api), POINTER_T(struct_pa_time_event), POINTER_T(None)))))),
    ('defer_new', POINTER_T(ctypes.CFUNCTYPE(POINTER_T(struct_pa_defer_event), POINTER_T(struct_pa_mainloop_api), POINTER_T(ctypes.CFUNCTYPE(None, POINTER_T(struct_pa_mainloop_api), POINTER_T(struct_pa_defer_event), POINTER_T(None))), POINTER_T(None)))),
    ('defer_enable', POINTER_T(ctypes.CFUNCTYPE(None, POINTER_T(struct_pa_defer_event), ctypes.c_int32))),
    ('defer_free', POINTER_T(ctypes.CFUNCTYPE(None, POINTER_T(struct_pa_defer_event)))),
    ('defer_set_destroy', POINTER_T(ctypes.CFUNCTYPE(None, POINTER_T(struct_pa_defer_event), POINTER_T(ctypes.CFUNCTYPE(None, POINTER_T(struct_pa_mainloop_api), POINTER_T(struct_pa_defer_event), POINTER_T(None)))))),
    ('quit', POINTER_T(ctypes.CFUNCTYPE(None, POINTER_T(struct_pa_mainloop_api), ctypes.c_int32))),
]

class struct_pollfd(ctypes.Structure):
    pass

class struct_pa_mainloop(ctypes.Structure):
    pass

pa_mainloop = struct_pa_mainloop
pa_mainloop_new = _libraries['libpulse.so'] .pa_mainloop_new
pa_mainloop_new.restype = POINTER_T(struct_pa_mainloop)
pa_mainloop_new.argtypes = []
pa_mainloop_free = _libraries['libpulse.so'] .pa_mainloop_free
pa_mainloop_free.restype = None
pa_mainloop_free.argtypes = [POINTER_T(struct_pa_mainloop)]

# pa_mainloop_prepare = _libraries['libpulse.so'] .pa_mainloop_prepare
# pa_mainloop_prepare.restype = ctypes.c_int32
# pa_mainloop_prepare.argtypes = [POINTER_T(struct_pa_mainloop), ctypes.c_int32]
# pa_mainloop_poll = _libraries['libpulse.so'] .pa_mainloop_poll
# pa_mainloop_poll.restype = ctypes.c_int32
# pa_mainloop_poll.argtypes = [POINTER_T(struct_pa_mainloop)]
# pa_mainloop_dispatch = _libraries['libpulse.so'] .pa_mainloop_dispatch
# pa_mainloop_dispatch.restype = ctypes.c_int32
# pa_mainloop_dispatch.argtypes = [POINTER_T(struct_pa_mainloop)]
# pa_mainloop_get_retval = _libraries['libpulse.so'] .pa_mainloop_get_retval
# pa_mainloop_get_retval.restype = ctypes.c_int32
# pa_mainloop_get_retval.argtypes = [POINTER_T(struct_pa_mainloop)]

pa_mainloop_iterate = _libraries['libpulse.so'] .pa_mainloop_iterate
pa_mainloop_iterate.restype = ctypes.c_int32
pa_mainloop_iterate.argtypes = [POINTER_T(struct_pa_mainloop), ctypes.c_int32, POINTER_T(ctypes.c_int32)]

# pa_mainloop_run = _libraries['libpulse.so'] .pa_mainloop_run
# pa_mainloop_run.restype = ctypes.c_int32
# pa_mainloop_run.argtypes = [POINTER_T(struct_pa_mainloop), POINTER_T(ctypes.c_int32)]
pa_mainloop_get_api = _libraries['libpulse.so'] .pa_mainloop_get_api
pa_mainloop_get_api.restype = POINTER_T(struct_pa_mainloop_api)
pa_mainloop_get_api.argtypes = [POINTER_T(struct_pa_mainloop)]
# pa_mainloop_quit = _libraries['libpulse.so'] .pa_mainloop_quit
# pa_mainloop_quit.restype = None
# pa_mainloop_quit.argtypes = [POINTER_T(struct_pa_mainloop), ctypes.c_int32]
# pa_mainloop_wakeup = _libraries['libpulse.so'] .pa_mainloop_wakeup
# pa_mainloop_wakeup.restype = None
# pa_mainloop_wakeup.argtypes = [POINTER_T(struct_pa_mainloop)]
# pa_poll_func = POINTER_T(ctypes.CFUNCTYPE(ctypes.c_int32, POINTER_T(struct_pollfd), ctypes.c_uint64, ctypes.c_int32, POINTER_T(None)))
# pa_mainloop_set_poll_func = _libraries['libpulse.so'] .pa_mainloop_set_poll_func
# pa_mainloop_set_poll_func.restype = None
# pa_mainloop_set_poll_func.argtypes = [POINTER_T(struct_pa_mainloop), pa_poll_func, POINTER_T(None)]

pa_operation_unref = _libraries['libpulse.so'] .pa_operation_unref
pa_operation_unref.restype = None
pa_operation_unref.argtypes = [POINTER_T(struct_pa_operation)]

# values for enumeration 'pa_sample_format'
# pa_sample_format__enumvalues = {
#     0: 'PA_SAMPLE_U8',
#     1: 'PA_SAMPLE_ALAW',
#     2: 'PA_SAMPLE_ULAW',
#     3: 'PA_SAMPLE_S16LE',
#     4: 'PA_SAMPLE_S16BE',
#     5: 'PA_SAMPLE_FLOAT32LE',
#     6: 'PA_SAMPLE_FLOAT32BE',
#     7: 'PA_SAMPLE_S32LE',
#     8: 'PA_SAMPLE_S32BE',
#     9: 'PA_SAMPLE_S24LE',
#     10: 'PA_SAMPLE_S24BE',
#     11: 'PA_SAMPLE_S24_32LE',
#     12: 'PA_SAMPLE_S24_32BE',
#     13: 'PA_SAMPLE_MAX',
#     -1: 'PA_SAMPLE_INVALID',
# }
# PA_SAMPLE_U8 = 0
# PA_SAMPLE_ALAW = 1
# PA_SAMPLE_ULAW = 2
# PA_SAMPLE_S16LE = 3
# PA_SAMPLE_S16BE = 4
# PA_SAMPLE_FLOAT32LE = 5
# PA_SAMPLE_FLOAT32BE = 6
# PA_SAMPLE_S32LE = 7
# PA_SAMPLE_S32BE = 8
# PA_SAMPLE_S24LE = 9
# PA_SAMPLE_S24BE = 10
# PA_SAMPLE_S24_32LE = 11
# PA_SAMPLE_S24_32BE = 12
# PA_SAMPLE_MAX = 13
# PA_SAMPLE_INVALID = -1
# pa_sample_format = ctypes.c_int # enum
# struct_pa_sample_spec._pack_ = True # source:False
# struct_pa_sample_spec._fields_ = [
#     ('format', pa_sample_format),
#     ('rate', ctypes.c_uint32),
#     ('channels', ctypes.c_ubyte),
#     ('PADDING_0', ctypes.c_ubyte * 3),
# ]
# 
# struct_timeval._pack_ = True # source:False
# struct_timeval._fields_ = [
#     ('tv_sec', ctypes.c_int64),
#     ('tv_usec', ctypes.c_int64),
# ]

pa_proplist_to_string = _libraries['libpulse.so'].pa_proplist_to_string
pa_proplist_to_string.restype = POINTER_T(ctypes.c_char)
pa_proplist_to_string.argtypes = [POINTER_T(struct_pa_proplist)]

pa_proplist_gets = _libraries['libpulse.so'].pa_proplist_gets
pa_proplist_gets.restype = POINTER_T(ctypes.c_char)
pa_proplist_gets.argtypes = [POINTER_T(struct_pa_proplist), POINTER_T(ctypes.c_char)]
PA_DIRECTION_OUTPUT = 0x0001
PA_DIRECTION_INPUT = 0x0002


__all__ = \
    ['PA_CONTEXT_AUTHORIZING', 'PA_CONTEXT_CONNECTING',
    'PA_CONTEXT_FAILED', 'PA_CONTEXT_NOAUTOSPAWN',
    'PA_CONTEXT_NOFAIL', 'PA_CONTEXT_NOFLAGS', 'PA_CONTEXT_READY',
    'PA_CONTEXT_SETTING_NAME', 'PA_CONTEXT_TERMINATED',
    'PA_CONTEXT_UNCONNECTED', 'PA_IO_EVENT_ERROR',
    'PA_IO_EVENT_HANGUP', 'PA_IO_EVENT_INPUT', 'PA_IO_EVENT_NULL',
    'PA_IO_EVENT_OUTPUT', 'PA_SAMPLE_ALAW', 'PA_SAMPLE_FLOAT32BE',
    'PA_SAMPLE_FLOAT32LE', 'PA_SAMPLE_INVALID', 'PA_SAMPLE_MAX',
    'PA_SAMPLE_S16BE', 'PA_SAMPLE_S16LE', 'PA_SAMPLE_S24BE',
    'PA_SAMPLE_S24LE', 'PA_SAMPLE_S24_32BE', 'PA_SAMPLE_S24_32LE',
    'PA_SAMPLE_S32BE', 'PA_SAMPLE_S32LE', 'PA_SAMPLE_U8',
    'PA_SAMPLE_ULAW', 'PA_UPDATE_MERGE', 'PA_UPDATE_REPLACE',
    'PA_UPDATE_SET', 'pa_context', 'pa_context_connect',
    'pa_context_disconnect', 'pa_context_drain', 'pa_context_errno',
    'pa_context_event_cb_t', 'pa_context_exit_daemon',
    'pa_context_flags', 'pa_context_flags_t',
    'pa_context_flags_t__enumvalues', 'pa_context_get_index',
    'pa_context_get_protocol_version', 'pa_context_get_server',
    'pa_context_get_server_protocol_version', 'pa_context_get_state',
    'pa_context_get_tile_size', 'pa_context_is_local',
    'pa_context_is_pending', 'pa_context_load_cookie_from_file',
    'pa_context_new', 'pa_context_new_with_proplist',
    'pa_context_notify_cb_t', 'pa_context_proplist_remove',
    'pa_context_proplist_update', 'pa_context_ref',
    'pa_context_rttime_new', 'pa_context_rttime_restart',
    'pa_context_set_default_sink', 'pa_context_set_default_source',
    'pa_context_set_event_callback', 'pa_context_set_name',
    'pa_context_set_state_callback', 'pa_context_state',
    'pa_context_state_t', 'pa_context_state_t__enumvalues',
    'pa_context_success_cb_t', 'pa_context_unref',
    'pa_io_event_flags', 'pa_mainloop', 'pa_mainloop_dispatch',
    'pa_mainloop_free', 'pa_mainloop_get_api',
    'pa_mainloop_get_retval', 'pa_mainloop_iterate',
    'pa_mainloop_new', 'pa_mainloop_poll', 'pa_mainloop_prepare',
    'pa_mainloop_quit', 'pa_mainloop_run',
    'pa_mainloop_set_poll_func', 'pa_mainloop_wakeup', 'pa_poll_func',
    'pa_sample_format', 'pa_time_event_cb_t', 'pa_update_mode',
    'pa_update_mode_t', 'pa_update_mode_t__enumvalues', 'pa_usec_t',
    'size_t', 'struct_pa_context', 'struct_pa_defer_event',
    'struct_pa_io_event', 'struct_pa_mainloop',
    'struct_pa_mainloop_api', 'struct_pa_operation',
    'struct_pa_proplist', 'struct_pa_sample_spec',
    'struct_pa_spawn_api', 'struct_pa_time_event', 'struct_pollfd',
    'struct_timeval', 'uint32_t','pa_proplist_to_string','pa_proplist_gets','PA_DIRECTION_OUTPUT', 'PA_DIRECTION_INPUT']
