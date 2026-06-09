if(NOT TARGET ReactAndroid::hermestooling)
add_library(ReactAndroid::hermestooling SHARED IMPORTED)
set_target_properties(ReactAndroid::hermestooling PROPERTIES
    IMPORTED_LOCATION "/private/var/folders/tt/79d7j_514gb5kf6gcyscq6580000gn/T/cursor-sandbox-cache/a4c31241669881e4d32aced494bbc7a6/gradle/caches/8.13/transforms/b142e6f75603c774d9881af962aaafa7/transformed/react-android-0.82.1-release/prefab/modules/hermestooling/libs/android.armeabi-v7a/libhermestooling.so"
    INTERFACE_INCLUDE_DIRECTORIES "/private/var/folders/tt/79d7j_514gb5kf6gcyscq6580000gn/T/cursor-sandbox-cache/a4c31241669881e4d32aced494bbc7a6/gradle/caches/8.13/transforms/b142e6f75603c774d9881af962aaafa7/transformed/react-android-0.82.1-release/prefab/modules/hermestooling/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

if(NOT TARGET ReactAndroid::jsi)
add_library(ReactAndroid::jsi SHARED IMPORTED)
set_target_properties(ReactAndroid::jsi PROPERTIES
    IMPORTED_LOCATION "/private/var/folders/tt/79d7j_514gb5kf6gcyscq6580000gn/T/cursor-sandbox-cache/a4c31241669881e4d32aced494bbc7a6/gradle/caches/8.13/transforms/b142e6f75603c774d9881af962aaafa7/transformed/react-android-0.82.1-release/prefab/modules/jsi/libs/android.armeabi-v7a/libjsi.so"
    INTERFACE_INCLUDE_DIRECTORIES "/private/var/folders/tt/79d7j_514gb5kf6gcyscq6580000gn/T/cursor-sandbox-cache/a4c31241669881e4d32aced494bbc7a6/gradle/caches/8.13/transforms/b142e6f75603c774d9881af962aaafa7/transformed/react-android-0.82.1-release/prefab/modules/jsi/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

if(NOT TARGET ReactAndroid::reactnative)
add_library(ReactAndroid::reactnative SHARED IMPORTED)
set_target_properties(ReactAndroid::reactnative PROPERTIES
    IMPORTED_LOCATION "/private/var/folders/tt/79d7j_514gb5kf6gcyscq6580000gn/T/cursor-sandbox-cache/a4c31241669881e4d32aced494bbc7a6/gradle/caches/8.13/transforms/b142e6f75603c774d9881af962aaafa7/transformed/react-android-0.82.1-release/prefab/modules/reactnative/libs/android.armeabi-v7a/libreactnative.so"
    INTERFACE_INCLUDE_DIRECTORIES "/private/var/folders/tt/79d7j_514gb5kf6gcyscq6580000gn/T/cursor-sandbox-cache/a4c31241669881e4d32aced494bbc7a6/gradle/caches/8.13/transforms/b142e6f75603c774d9881af962aaafa7/transformed/react-android-0.82.1-release/prefab/modules/reactnative/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

