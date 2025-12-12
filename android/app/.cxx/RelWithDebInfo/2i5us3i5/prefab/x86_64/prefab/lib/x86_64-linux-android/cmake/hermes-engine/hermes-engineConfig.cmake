if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "/Users/maornelas/.gradle/caches/8.13/transforms/1af2150d394f770a4fd4bf0c805d0ec7/transformed/hermes-android-0.82.1-release/prefab/modules/hermesvm/libs/android.x86_64/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/maornelas/.gradle/caches/8.13/transforms/1af2150d394f770a4fd4bf0c805d0ec7/transformed/hermes-android-0.82.1-release/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

