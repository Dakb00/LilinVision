#pragma once

#include <sqlite3.h>
#include <mutex>
#include <string>
#include <ports/ICameraRepository.hpp>

namespace vms {

/**
 * @brief Concrete implementation of ICameraRepository using SQLite3.
 */
class SQLiteCameraRepository : public ICameraRepository {
public:
    SQLiteCameraRepository(const std::string& db_path);
    ~SQLiteCameraRepository();

    // Camera Management
    std::vector<Camera> getAllCameras() override;
    std::optional<Camera> getCameraById(int id) override;
    bool addCamera(const Camera& camera) override;
    bool removeCamera(int id) override;
    bool updateCameraStatus(int id, const std::string& status) override;

    // Detection History
    bool saveDetection(const DetectionEvent& event) override;
    std::vector<DetectionEvent> getRecentDetections(int limit = 50) override;
    std::vector<DetectionEvent> getDetectionsByCamera(int camera_id, int limit = 50) override;
    int cleanupOldDetections(int days) override;

private:
    void initializeSchema();
    sqlite3* m_db;
    std::mutex m_dbMutex; // Thread-safe database access
};

} // namespace vms
