cmake_minimum_required(VERSION 3.16)
project(vms-lite VERSION 0.1.0 LANGUAGES CXX)

# --- Compiler Configuration ---
set(CMAKE_CXX_STANDARD 17)
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
find_package(DarkHelp REQUIRED)
message(STATUS "DarkHelp found at: ${DarkHelp_DIR}")

# Darknet is often a dependency of DarkHelp or found via pkg-config
# In some installations, we may need to link it explicitly
find_package(darknet REQUIRED)
message(STATUS "darknet found at: ${darknet_DIR}")

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
...

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
# Add models
install(DIRECTORY models/ DESTINATION share/vms-lite/models)
