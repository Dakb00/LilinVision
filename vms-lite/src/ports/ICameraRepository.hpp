#pragma once

#include <vector>
#include <optional>
#include <domain/Entities.hpp>

namespace vms {

/**
 * @brief Interface for database storage (Cameras and Detections).
 */
class ICameraRepository {
public:
    virtual ~ICameraRepository() = default;

    // --- Camera Management ---
    virtual std::vector<Camera> getAllCameras() = 0;
    virtual std::optional<Camera> getCameraById(int id) = 0;
    virtual bool addCamera(const Camera& camera) = 0;
    virtual bool removeCamera(int id) = 0;
    virtual bool updateCameraStatus(int id, const std::string& status) = 0;

    // --- Detection History ---
    virtual bool saveDetection(const DetectionEvent& event) = 0;
    virtual std::vector<DetectionEvent> getRecentDetections(int limit = 50) = 0;
    virtual std::vector<DetectionEvent> getDetectionsByCamera(int camera_id, int limit = 50) = 0;
    
    /**
     * @brief Circular buffer logic: Delete detections older than X days.
     */
    virtual int cleanupOldDetections(int days) = 0;
};

} // namespace vms
