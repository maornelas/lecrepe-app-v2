if(NOT TARGET fbjni::fbjni)
add_library(fbjni::fbjni SHARED IMPORTED)
set_target_properties(fbjni::fbjni PROPERTIES
    IMPORTED_LOCATION "/private/var/folders/tt/79d7j_514gb5kf6gcyscq6580000gn/T/cursor-sandbox-cache/5c794d6ca57d66dfd72ce33164f3b6c8/gradle/caches/8.13/transforms/066ab4ee048cd2b737a2cef809d0db8a/transformed/fbjni-0.7.0/prefab/modules/fbjni/libs/android.armeabi-v7a/libfbjni.so"
    INTERFACE_INCLUDE_DIRECTORIES "/private/var/folders/tt/79d7j_514gb5kf6gcyscq6580000gn/T/cursor-sandbox-cache/5c794d6ca57d66dfd72ce33164f3b6c8/gradle/caches/8.13/transforms/066ab4ee048cd2b737a2cef809d0db8a/transformed/fbjni-0.7.0/prefab/modules/fbjni/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

