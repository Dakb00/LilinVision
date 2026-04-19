#include "SQLiteCameraRepository.hpp"
#include <iostream>
#include <vector>
#include <chrono>

namespace vms {

SQLiteCameraRepository::SQLiteCameraRepository(const std::string& db_path) : m_db(nullptr) {
    if (sqlite3_open(db_path.c_str(), &m_db) != SQLITE_OK) {
        std::cerr << "Can't open database: " << sqlite3_errmsg(m_db) << std::endl;
    } else {
        initializeSchema();
        // Run initial cleanup on startup
        cleanupOldDetections(30); 
    }
}

SQLiteCameraRepository::~SQLiteCameraRepository() {
    if (m_db) {
        sqlite3_close(m_db);
    }
}

void SQLiteCameraRepository::initializeSchema() {
    const char* sql_cameras = 
        "CREATE TABLE IF NOT EXISTS cameras ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "name TEXT NOT NULL,"
        "rtsp_url TEXT NOT NULL,"
        "is_enabled INTEGER DEFAULT 1,"
        "status TEXT DEFAULT 'Idle');";

    const char* sql_detections = 
        "CREATE TABLE IF NOT EXISTS detections ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "camera_id INTEGER NOT NULL,"
        "timestamp INTEGER NOT NULL,"
        "label TEXT NOT NULL,"
        "confidence REAL NOT NULL,"
        "image_data BLOB,"
        "FOREIGN KEY(camera_id) REFERENCES cameras(id));";

    char* errMsg = nullptr;
    sqlite3_exec(m_db, sql_cameras, nullptr, nullptr, &errMsg);
    sqlite3_exec(m_db, sql_detections, nullptr, nullptr, &errMsg);
    if (errMsg) {
        std::cerr << "SQL error: " << errMsg << std::endl;
        sqlite3_free(errMsg);
    }
}

std::vector<Camera> SQLiteCameraRepository::getAllCameras() {
    std::lock_guard<std::mutex> lock(m_dbMutex);
    std::vector<Camera> cameras;
    const char* sql = "SELECT id, name, rtsp_url, is_enabled, status FROM cameras;";
    sqlite3_stmt* stmt;

    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) == SQLITE_OK) {
        while (sqlite3_step(stmt) == SQLITE_ROW) {
            Camera cam;
            cam.id = sqlite3_column_int(stmt, 0);
            cam.name = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
            cam.rtsp_url = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
            cam.is_enabled = sqlite3_column_int(stmt, 3) != 0;
            cam.status = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4));
            cameras.push_back(cam);
        }
    }
    sqlite3_finalize(stmt);
    return cameras;
}

std::optional<Camera> SQLiteCameraRepository::getCameraById(int id) {
    std::lock_guard<std::mutex> lock(m_dbMutex);
    const char* sql = "SELECT id, name, rtsp_url, is_enabled, status FROM cameras WHERE id = ?;";
    sqlite3_stmt* stmt;
    std::optional<Camera> result;

    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) == SQLITE_OK) {
        sqlite3_bind_int(stmt, 1, id);
        if (sqlite3_step(stmt) == SQLITE_ROW) {
            Camera cam;
            cam.id = sqlite3_column_int(stmt, 0);
            cam.name = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
            cam.rtsp_url = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
            cam.is_enabled = sqlite3_column_int(stmt, 3) != 0;
            cam.status = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4));
            result = cam;
        }
    }
    sqlite3_finalize(stmt);
    return result;
}

bool SQLiteCameraRepository::saveDetection(const DetectionEvent& event) {
    std::lock_guard<std::mutex> lock(m_dbMutex);
    const char* sql = "INSERT INTO detections (camera_id, timestamp, label, confidence, image_data) VALUES (?, ?, ?, ?, ?);";
    sqlite3_stmt* stmt;
    bool success = false;

    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) == SQLITE_OK) {
        sqlite3_bind_int(stmt, 1, event.camera_id);
        sqlite3_bind_int64(stmt, 2, event.timestamp);
        sqlite3_bind_text(stmt, 3, event.label.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_double(stmt, 4, event.confidence);
        
        if (!event.image_data.empty()) {
            sqlite3_bind_blob(stmt, 5, event.image_data.data(), event.image_data.size(), SQLITE_TRANSIENT);
        } else {
            sqlite3_bind_null(stmt, 5);
        }

        if (sqlite3_step(stmt) == SQLITE_DONE) {
            success = true;
        }
    }
    sqlite3_finalize(stmt);
    return success;
}

int SQLiteCameraRepository::cleanupOldDetections(int days) {
    std::lock_guard<std::mutex> lock(m_dbMutex);
    auto now = std::chrono::system_clock::to_time_t(std::chrono::system_clock::now());
    long long cutoff = static_cast<long long>(now) - (days * 24 * 60 * 60);

    const char* sql = "DELETE FROM detections WHERE timestamp < ?;";
    sqlite3_stmt* stmt;
    int deleted_count = 0;

    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) == SQLITE_OK) {
        sqlite3_bind_int64(stmt, 1, cutoff);
        if (sqlite3_step(stmt) == SQLITE_DONE) {
            deleted_count = sqlite3_changes(m_db);
        }
    }
    sqlite3_finalize(stmt);
    
    if (deleted_count > 0) {
        std::cout << "[DB] Circular Buffer: Deleted " << deleted_count << " detections older than " << days << " days." << std::endl;
    }
    return deleted_count;
}

// ... other CRUD methods (addCamera, removeCamera, updateCameraStatus) follow same pattern ...
bool SQLiteCameraRepository::addCamera(const Camera& cam) {
    std::lock_guard<std::mutex> lock(m_dbMutex);
    const char* sql = "INSERT INTO cameras (name, rtsp_url, is_enabled) VALUES (?, ?, ?);";
    sqlite3_stmt* stmt;
    bool success = false;
    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) == SQLITE_OK) {
        sqlite3_bind_text(stmt, 1, cam.name.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, 2, cam.rtsp_url.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int(stmt, 3, cam.is_enabled ? 1 : 0);
        if (sqlite3_step(stmt) == SQLITE_DONE) success = true;
    }
    sqlite3_finalize(stmt);
    return success;
}

bool SQLiteCameraRepository::removeCamera(int id) {
    std::lock_guard<std::mutex> lock(m_dbMutex);
    const char* sql = "DELETE FROM cameras WHERE id = ?;";
    sqlite3_stmt* stmt;
    bool success = false;
    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) == SQLITE_OK) {
        sqlite3_bind_int(stmt, 1, id);
        if (sqlite3_step(stmt) == SQLITE_DONE) success = true;
    }
    sqlite3_finalize(stmt);
    return success;
}

bool SQLiteCameraRepository::updateCameraStatus(int id, const std::string& status) {
    std::lock_guard<std::mutex> lock(m_dbMutex);
    const char* sql = "UPDATE cameras SET status = ? WHERE id = ?;";
    sqlite3_stmt* stmt;
    bool success = false;
    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) == SQLITE_OK) {
        sqlite3_bind_text(stmt, 1, status.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int(stmt, 2, id);
        if (sqlite3_step(stmt) == SQLITE_DONE) success = true;
    }
    sqlite3_finalize(stmt);
    return success;
}

std::vector<DetectionEvent> SQLiteCameraRepository::getRecentDetections(int limit) {
    std::lock_guard<std::mutex> lock(m_dbMutex);
    std::vector<DetectionEvent> events;
    const char* sql = "SELECT id, camera_id, timestamp, label, confidence FROM detections ORDER BY timestamp DESC LIMIT ?;";
    sqlite3_stmt* stmt;

    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) == SQLITE_OK) {
        sqlite3_bind_int(stmt, 1, limit);
        while (sqlite3_step(stmt) == SQLITE_ROW) {
            DetectionEvent ev;
            ev.id = sqlite3_column_int(stmt, 0);
            ev.camera_id = sqlite3_column_int(stmt, 1);
            ev.timestamp = sqlite3_column_int64(stmt, 2);
            ev.label = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
            ev.confidence = static_cast<float>(sqlite3_column_double(stmt, 4));
            // We don't load binary data for "Recent" lists to keep it fast
            events.push_back(ev);
        }
    }
    sqlite3_finalize(stmt);
    return events;
}

std::vector<DetectionEvent> SQLiteCameraRepository::getDetectionsByCamera(int camera_id, int limit) {
    std::lock_guard<std::mutex> lock(m_dbMutex);
    std::vector<DetectionEvent> events;
    const char* sql = "SELECT id, camera_id, timestamp, label, confidence FROM detections WHERE camera_id = ? ORDER BY timestamp DESC LIMIT ?;";
    sqlite3_stmt* stmt;

    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) == SQLITE_OK) {
        sqlite3_bind_int(stmt, 1, camera_id);
        sqlite3_bind_int(stmt, 2, limit);
        while (sqlite3_step(stmt) == SQLITE_ROW) {
            DetectionEvent ev;
            ev.id = sqlite3_column_int(stmt, 0);
            ev.camera_id = sqlite3_column_int(stmt, 1);
            ev.timestamp = sqlite3_column_int64(stmt, 2);
            ev.label = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
            ev.confidence = static_cast<float>(sqlite3_column_double(stmt, 4));
            events.push_back(ev);
        }
    }
    sqlite3_finalize(stmt);
    return events;
}

} // namespace vms
