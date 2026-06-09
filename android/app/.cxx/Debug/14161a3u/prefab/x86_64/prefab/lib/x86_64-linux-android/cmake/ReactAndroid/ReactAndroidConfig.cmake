if(NOT TARGET ReactAndroid::hermestooling)
add_library(ReactAndroid::hermestooling SHARED IMPORTED)
set_target_properties(ReactAndroid::hermestooling PROPERTIES
    IMPORTED_LOCATION "/private/var/folders/tt/79d7j_514gb5kf6gcyscq6580000gn/T/cursor-sandbox-cache/5c794d6ca57d66dfd72ce33164f3b6c8/gradle/caches/8.13/transforms/1a605be92e232fc57f5124a2f7631a5e/transformed/react-android-0.82.1-debug/prefab/modules/hermestooling/libs/android.x86_64/libhermestooling.so"
    INTERFACE_INCLUDE_DIRECTORIES "/private/var/folders/tt/79d7j_514gb5kf6gcyscq6580000gn/T/cursor-sandbox-cache/5c794d6ca57d66dfd72ce33164f3b6c8/gradle/caches/8.13/transforms/1a605be92e232fc57f5124a2f7631a5e/transformed/react-android-0.82.1-debug/prefab/modules/hermestooling/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

if(NOT TARGET ReactAndroid::jsi)
add_library(ReactAndroid::jsi SHARED IMPORTED)
set_target_properties(ReactAndroid::jsi PROPERTIES
    IMPORTED_LOCATION "/private/var/folders/tt/79d7j_514gb5kf6gcyscq6580000gn/T/cursor-sandbox-cache/5c794d6ca57d66dfd72ce33164f3b6c8/gradle/caches/8.13/transforms/1a605be92e232fc57f5124a2f7631a5e/transformed/react-android-0.82.1-debug/prefab/modules/jsi/libs/android.x86_64/libjsi.so"
    INTERFACE_INCLUDE_DIRECTORIES "/private/var/folders/tt/79d7j_514gb5kf6gcyscq6580000gn/T/cursor-sandbox-cache/5c794d6ca57d66dfd72ce33164f3b6c8/gradle/caches/8.13/transforms/1a605be92e232fc57f5124a2f7631a5e/transformed/react-android-0.82.1-debug/prefab/modules/jsi/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

if(NOT TARGET ReactAndroid::reactnative)
add_library(ReactAndroid::reactnative SHARED IMPORTED)
set_target_properties(ReactAndroid::reactnative PROPERTIES
    IMPORTED_LOCATION "/private/var/folders/tt/79d7j_514gb5kf6gcyscq6580000gn/T/cursor-sandbox-cache/5c794d6ca57d66dfd72ce33164f3b6c8/gradle/caches/8.13/transforms/1a605be92e232fc57f5124a2f7631a5e/transformed/react-android-0.82.1-debug/prefab/modules/reactnative/libs/android.x86_64/libreactnative.so"
    INTERFACE_INCLUDE_DIRECTORIES "/private/var/folders/tt/79d7j_514gb5kf6gcyscq6580000gn/T/cursor-sandbox-cache/5c794d6ca57d66dfd72ce33164f3b6c8/gradle/caches/8.13/transforms/1a605be92e232fc57f5124a2f7631a5e/transformed/react-android-0.82.1-debug/prefab/modules/reactnative/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

