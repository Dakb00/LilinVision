#pragma once

#include <string>
#include <vector>

namespace vms {

/**
 * @brief Represents a single camera in the system.
 */
struct Camera {
    int id;
    std::string name;
    std::string rtsp_url;
    bool is_enabled;
    std::string status; // e.g., "Connecting", "Streaming", "Error"
};

/**
 * @brief Represents a detection event stored in the database.
 */
struct DetectionEvent {
    int id;
    int camera_id;
    long long timestamp; // Unix epoch
    std::string label;
    float confidence;
    std::vector<unsigned char> image_data; // Binary blob (JPEG)
};

} // namespace vms
