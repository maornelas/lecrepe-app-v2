if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "/private/var/folders/tt/79d7j_514gb5kf6gcyscq6580000gn/T/cursor-sandbox-cache/5c794d6ca57d66dfd72ce33164f3b6c8/gradle/caches/8.13/transforms/05d88a454e859816b9bc0b86d187f0da/transformed/hermes-android-0.82.1-debug/prefab/modules/hermesvm/libs/android.arm64-v8a/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "/private/var/folders/tt/79d7j_514gb5kf6gcyscq6580000gn/T/cursor-sandbox-cache/5c794d6ca57d66dfd72ce33164f3b6c8/gradle/caches/8.13/transforms/05d88a454e859816b9bc0b86d187f0da/transformed/hermes-android-0.82.1-debug/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

