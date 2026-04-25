cmake_minimum_required(VERSION 3.16)
project(vms-lite VERSION 0.1.0 LANGUAGES CXX)

# --- Compiler Configuration ---
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Add -O3 optimization and warnings
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -Wall -Wextra")

# --- Dependencies ---
# 1. OpenCV
find_package(OpenCV REQUIRED)
message(STATUS "OpenCV found at: ${OpenCV_DIR}")
message(STATUS "OpenCV libraries: ${OpenCV_LIBS}")

# 2. SQLite3
find_package(SQLite3 REQUIRED)
message(STATUS "SQLite3 found at: ${SQLite3_LIBRARIES}")

# 3. Darknet & DarkHelp (System Installed)
# Try find_package first
find_package(DarkHelp QUIET)
find_package(darknet QUIET)

# Fallback to manual discovery if find_package failed
if(NOT DarkHelp_FOUND)
    message(STATUS "DarkHelp not found via find_package, searching manually...")
    find_path(DarkHelp_INCLUDE_DIR NAMES DarkHelp.hpp PATHS /usr/local/include /usr/include)
    find_library(DarkHelp_LIBRARY NAMES darkhelp PATHS /usr/local/lib /usr/lib)
    
    if(DarkHelp_INCLUDE_DIR AND DarkHelp_LIBRARY)
        set(DarkHelp_FOUND TRUE)
        add_library(DarkHelp::DarkHelp SHARED IMPORTED)
        set_target_properties(DarkHelp::DarkHelp PROPERTIES
            INTERFACE_INCLUDE_DIRECTORIES "${DarkHelp_INCLUDE_DIR}"
            IMPORTED_LOCATION "${DarkHelp_LIBRARY}"
        )
        message(STATUS "DarkHelp manually found: ${DarkHelp_LIBRARY}")
    else()
        message(FATAL_ERROR "DarkHelp NOT found. Please install it first.")
    endif()
endif()

if(NOT darknet_FOUND)
    message(STATUS "darknet not found via find_package, searching manually...")
    find_path(darknet_INCLUDE_DIR NAMES darknet.h PATHS /usr/local/include /usr/include)
    find_library(darknet_LIBRARY NAMES darknet PATHS /usr/local/lib /usr/lib)
    
    if(darknet_INCLUDE_DIR AND darknet_LIBRARY)
        set(darknet_FOUND TRUE)
        add_library(darknet::darknet SHARED IMPORTED)
        set_target_properties(darknet::darknet PROPERTIES
            INTERFACE_INCLUDE_DIRECTORIES "${darknet_INCLUDE_DIR}"
            IMPORTED_LOCATION "${darknet_LIBRARY}"
        )
        message(STATUS "darknet manually found: ${darknet_LIBRARY}")
    else()
        message(FATAL_ERROR "darknet NOT found. Please install it first.")
    endif()
endif()

# --- Include Directories ---
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${OpenCV_INCLUDE_DIRS}
    ${SQLite3_INCLUDE_DIRS}
    ${DarkHelp_INCLUDE_DIRS}
    ${darknet_INCLUDE_DIRS}
)

# --- Source Files ---
file(GLOB_RECURSE SOURCES "src/*.cpp")
file(GLOB_RECURSE HEADERS "src/*.hpp" "src/*.h")
# --- Executable ---
add_executable(${PROJECT_NAME} ${SOURCES} ${HEADERS})

# --- Testing ---
enable_testing()
find_package(GTest REQUIRED)
include(GoogleTest)

# Create a test runner that includes our source files (excluding main.cpp)
file(GLOB_RECURSE TEST_SOURCES "tests/*.cpp")
# We need to filter out main.cpp from the core sources to avoid double main()
list(FILTER SOURCES EXCLUDE REGEX "src/main.cpp")

add_executable(vms-tests ${TEST_SOURCES} ${SOURCES} ${HEADERS})
target_link_libraries(vms-tests
    PRIVATE
    ${OpenCV_LIBS}
    ${SQLite3_LIBRARIES}
    DarkHelp::DarkHelp
    darknet::darknet
    GTest::GTest
    GTest::Main
)
gtest_discover_tests(vms-tests)

# --- Linking ---
target_link_libraries(${PROJECT_NAME}
    PRIVATE
    ${OpenCV_LIBS}
    ${SQLite3_LIBRARIES}
    DarkHelp::DarkHelp
    darknet::darknet
)

# --- Install (FHS) ---
install(TARGETS ${PROJECT_NAME} DESTINATION bin)
# Add static GUI assets
install(DIRECTORY gui/ DESTINATION share/vms-lite/www)
# Add models (using the correct source path)
install(FILES 
    ../yoloweights/peoplerpeople/people.cfg 
    ../yoloweights/peoplerpeople/people.weights 
    ../yoloweights/peoplerpeople/people.names
    DESTINATION share/vms-lite/models
)

# --- CPack Configuration (.deb) ---
set(CPACK_GENERATOR "DEB")
set(CPACK_PACKAGE_NAME "vms-lite")
set(CPACK_PACKAGE_VERSION "${PROJECT_VERSION}")
set(CPACK_PACKAGE_VENDOR "LilinVision")
set(CPACK_PACKAGE_CONTACT "support@lilinvision.com")
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "High-performance lightweight VMS backend")
set(CPACK_DEBIAN_PACKAGE_MAINTAINER "LilinVision Team")
set(CPACK_DEBIAN_PACKAGE_SECTION "utils")
set(CPACK_DEBIAN_PACKAGE_PRIORITY "optional")
set(CPACK_DEBIAN_PACKAGE_DEPENDS "libopencv-dev, libsqlite3-dev, darknet, darkhelp")

# Debian control scripts
set(CPACK_DEBIAN_PACKAGE_CONTROL_EXTRA 
    "${CMAKE_CURRENT_SOURCE_DIR}/packaging/postinst;${CMAKE_CURRENT_SOURCE_DIR}/packaging/prerm"
)

# Systemd unit file installation
install(FILES vms-lite.service DESTINATION lib/systemd/system)

include(CPack)
