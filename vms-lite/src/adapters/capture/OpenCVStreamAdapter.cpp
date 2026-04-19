#include "OpenCVStreamAdapter.hpp"
#include <iostream>
#include <cstdlib>

namespace vms {

OpenCVStreamAdapter::OpenCVStreamAdapter() {}

OpenCVStreamAdapter::~OpenCVStreamAdapter() {
    close();
}

bool OpenCVStreamAdapter::open(const std::string& url) {
    m_url = url;
    
    // DECISION: Force RTSP over TCP for stability
    // OpenCV uses FFMPEG as its backend; we can set env variables for FFMPEG options.
    setenv("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp", 1);
    
    // Open the stream with FFMPEG backend
    if (!m_cap.open(m_url, cv::CAP_FFMPEG)) {
        std::cerr << "[Capture] Failed to open RTSP stream: " << m_url << std::endl;
        return false;
    }

    // Performance Tweaks:
    // 1. Set a small buffer size to reduce latency
    m_cap.set(cv::CAP_PROP_BUFFERSIZE, 1);
    
    std::cout << "[Capture] Successfully opened stream: " << m_url << " (TCP mode)" << std::endl;
    return true;
}

std::shared_ptr<cv::Mat> OpenCVStreamAdapter::grabNextFrame() {
    if (!m_cap.isOpened()) return nullptr;

    auto frame = std::make_shared<cv::Mat>();
    
    // grab() + retrieve() is slightly better for performance than read()
    // but in a single-thread loop read() is fine.
    if (!m_cap.read(*frame)) {
        return nullptr;
    }

    if (frame->empty()) {
        return nullptr;
    }

    return frame;
}

void OpenCVStreamAdapter::close() {
    if (m_cap.isOpened()) {
        m_cap.release();
    }
}

bool OpenCVStreamAdapter::isOpened() const {
    return m_cap.isOpened();
}

} // namespace vms
