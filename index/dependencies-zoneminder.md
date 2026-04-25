# ZoneMinder Dependencies

This document lists the external and internal dependencies required to build and run ZoneMinder.

## Build System & Compiler
- **CMake** (>= 3.12)
- **C++17 Compiler** (GCC 9+, Clang)
- **Perl** (>= 5.6.0)
- **PHP** (>= 5.3.0, < 8.0.0, recommended 7.x)
- **MySQL/MariaDB** (Client and Server)
- **Web Server** (Apache or Nginx)
- **Git** (for submodule management)

## Core Libraries (C++)
- **FFmpeg** (>= 55.34.100)
    - Required components: `avcodec`, `avdevice`, `avfilter`, `avformat`, `avutil`, `swresample`, `swscale`
- **libjpeg**
- **libcurl**
- **zlib**
- **OpenSSL** / **GnuTLS** (Crypto backends)
- **libpcre2** (specifically `pcre2-8`)
- **Pthreads** (standard C++ threads)
- **libjwt** / **jwt-cpp** (JWT backend for API)
- **libvlc** (Optional: for VLC input)
- **libvncclient** (Optional: for VNC input)
- **gsoap** (Optional: for ONVIF protocol support)
- **Mosquitto** and **Mosquittopp** (Optional: for MQTT support)
- **V4L2** (Video4Linux2 headers for USB/Analog camera support)
- **nlohmann_json** (Optional: for AI object detection results)
- **Catch2** (Optional: for running unit tests)
- **libunwind** (Optional: for detailed stack traces on ARM)
- **Polkit** (Optional: required for systemd integration)

## Perl Modules
Required for core management daemons and scripts:
- **Sys::Syslog**
- **DBI**
- **DBD::mysql**
- **Getopt::Long**
- **Time::HiRes**
- **Date::Manip**
- **LWP::UserAgent**
- **Sys::Mmap** (Optional: for shared memory support)

## PHP Components & Libraries
ZoneMinder uses the CakePHP framework (typically bundled as a submodule).
- **CakePHP** (Web framework)
- **firebase/php-jwt** (JWT support for API)
- **ircmaxell/password-compat** (Compatibility for password hashing)
- **ext-openssl** / **ext-mcrypt** (Encryption)
- **ext-json**
- **ext-pdo_mysql** (Database connectivity)

## System Binaries & Utilities
- **ffmpeg** / **avconv** (For video processing/streaming)
- **arp** / **ip** (For monitor probe functionality)
- **arp-scan** (Optional: enhanced monitor probe)
- **rm**, **uname**, **ifconfig**, **shutdown** (Standard system tools)
- **pod2man** (For generating man pages)
- **ccache** (Optional: to speed up builds)

## Bundled Dependencies (Internal)
Located in `zoneminder/dep/`:
- **CxxUrl**: URL parsing library
- **jwt-cpp**: Header-only C++ library for JSON Web Token (if not using system library)
- **libbcrypt**: Password hashing library
- **RtspServer**: Built-in RTSP server support
- **span-lite**: C++20 `std::span` backport for C++98/11/14/17
