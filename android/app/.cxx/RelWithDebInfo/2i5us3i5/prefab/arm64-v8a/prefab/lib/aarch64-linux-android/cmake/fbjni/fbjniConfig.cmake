if(NOT TARGET fbjni::fbjni)
add_library(fbjni::fbjni SHARED IMPORTED)
set_target_properties(fbjni::fbjni PROPERTIES
    IMPORTED_LOCATION "/private/var/folders/tt/79d7j_514gb5kf6gcyscq6580000gn/T/cursor-sandbox-cache/a4c31241669881e4d32aced494bbc7a6/gradle/caches/8.13/transforms/066ab4ee048cd2b737a2cef809d0db8a/transformed/fbjni-0.7.0/prefab/modules/fbjni/libs/android.arm64-v8a/libfbjni.so"
    INTERFACE_INCLUDE_DIRECTORIES "/private/var/folders/tt/79d7j_514gb5kf6gcyscq6580000gn/T/cursor-sandbox-cache/a4c31241669881e4d32aced494bbc7a6/gradle/caches/8.13/transforms/066ab4ee048cd2b737a2cef809d0db8a/transformed/fbjni-0.7.0/prefab/modules/fbjni/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

