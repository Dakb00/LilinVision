#include "CrowRestServer.hpp"
#include "crow_all.h"
#include <iostream>
#include <fstream>
#include <sstream>

namespace vms {

CrowRestServer::CrowRestServer(
    std::shared_ptr<ICameraRepository> repository,
    std::shared_ptr<StreamManager> stream_manager,
    const std::string& static_path
) : m_repository(repository), m_streamManager(stream_manager), m_staticPath(static_path) {
    m_startTime = std::chrono::steady_clock::now();
}

CrowRestServer::~CrowRestServer() {}

void CrowRestServer::run(int port) {
    crow::SimpleApp app;
    
    // Clean static path (remove trailing slash)
    std::string clean_path = m_staticPath;
    if (!clean_path.empty() && clean_path.back() == '/') {
        clean_path.pop_back();
    }
    // ... (rest of API routes)

    // --- API: List all cameras ---
    CROW_ROUTE(app, "/api/v1/cameras")
    ([this](){
        auto cameras = m_repository->getAllCameras();
        crow::json::wvalue x;
        std::vector<crow::json::wvalue> cam_list;
        for (const auto& cam : cameras) {
            crow::json::wvalue c;
            c["id"] = cam.id;
            c["name"] = cam.name;
            c["rtsp_url"] = cam.rtsp_url;
            c["is_enabled"] = cam.is_enabled;
            c["status"] = cam.status;
            cam_list.push_back(std::move(c));
        }
        x = std::move(cam_list);
        return x;
    });

    // --- API: Add a camera ---
    CROW_ROUTE(app, "/api/v1/cameras").methods(crow::HTTPMethod::POST)
    ([this](const crow::request& req){
        auto body = crow::json::load(req.body);
        if (!body) return crow::response(400);

        Camera cam;
        cam.name = body["name"].s();
        cam.rtsp_url = body["rtsp_url"].s();
        cam.is_enabled = true;
        
        if (m_repository->addCamera(cam)) {
            // Restart manager to pick up new camera
            m_streamManager->startAll();
            return crow::response(201);
        }
        return crow::response(500);
    });

    // --- API: Delete a camera ---
    CROW_ROUTE(app, "/api/v1/cameras/<int>").methods(crow::HTTPMethod::DELETE)
    ([this](int id){
        m_streamManager->stopCamera(id);
        if (m_repository->removeCamera(id)) {
            return crow::response(200);
        }
        return crow::response(500);
    });

    // --- API: System Status ---
    CROW_ROUTE(app, "/api/v1/status")
    ([this](){
        auto now = std::chrono::steady_clock::now();
        auto uptime = std::chrono::duration_cast<std::chrono::seconds>(now - m_startTime).count();
        
        crow::json::wvalue x;
        x["uptime_seconds"] = uptime;
        x["camera_count"] = (int)m_repository->getAllCameras().size();
        x["detections_today"] = m_repository->getTotalDetectionsToday();
        return x;
    });

    // --- API: Get Snapshot ---
    CROW_ROUTE(app, "/api/v1/detections/<int>/snapshot")
    ([this](int id){
        auto det = m_repository->getDetectionById(id);
        if (!det || det->image_data.empty()) {
            return crow::response(404);
        }
        crow::response res;
        res.set_header("Content-Type", "image/jpeg");
        res.body = std::string(det->image_data.begin(), det->image_data.end());
        return res;
    });

    // --- API: Settings (Webhook) ---
    CROW_ROUTE(app, "/api/v1/settings/webhook_url")
    ([this](){
        crow::json::wvalue x;
        x["url"] = m_repository->getSetting("webhook_url", "");
        return x;
    });

    CROW_ROUTE(app, "/api/v1/settings/webhook_url").methods(crow::HTTPMethod::POST)
    ([this](const crow::request& req){
        auto body = crow::json::load(req.body);
        if (!body || !body.has("url")) return crow::response(400);
        
        if (m_repository->setSetting("webhook_url", body["url"].s())) {
            return crow::response(200);
        }
        return crow::response(500);
    });

    // --- API: List recent detections ---
    CROW_ROUTE(app, "/api/v1/detections")
    ([this](){
        auto detections = m_repository->getRecentDetections(50);
        std::vector<crow::json::wvalue> det_list;
        for (const auto& det : detections) {
            crow::json::wvalue d;
            d["id"] = det.id;
            d["camera_id"] = det.camera_id;
            d["timestamp"] = det.timestamp;
            d["label"] = det.label;
            d["confidence"] = det.confidence;
            det_list.push_back(std::move(d));
        }
        return crow::json::wvalue(std::move(det_list));
    });

    // --- MJPEG Stream Endpoint (Decision 1 & 2) ---
    CROW_ROUTE(app, "/api/v1/stream/<int>")
    ([this](const crow::request&, crow::response& res, int id){
        res.set_header("Content-Type", "multipart/x-mixed-replace; boundary=frame");
        while (res.is_alive()) {
            auto frame = m_streamManager->getLatestFrame(id);
            if (frame && !frame->empty()) {
                std::vector<unsigned char> buffer;
                cv::imencode(".jpg", *frame, buffer);
                
                std::string part = "--frame\r\n";
                part += "Content-Type: image/jpeg\r\n";
                part += "Content-Length: " + std::to_string(buffer.size()) + "\r\n\r\n";
                part += std::string(buffer.begin(), buffer.end());
                part += "\r\n";
                
                res.write(part);
            }
            // CAP FPS: 10 FPS (100ms delay)
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
        res.end();
    });

    // --- Static Files (React GUI) ---
    CROW_ROUTE(app, "/")
    ([clean_path](){
        std::string full_path = clean_path + "/index.html";
        std::ifstream file(full_path);
        if (!file.is_open()) {
            std::cerr << "[Web] ERROR: Could not open " << full_path << std::endl;
            return crow::response(404, "Index file not found");
        }
        std::stringstream buffer;
        buffer << file.rdbuf();
        crow::response res(buffer.str());
        res.set_header("Content-Type", "text/html");
        return res;
    });

    // --- Static Files (Generic Handler) ---
    // This replaces the old specific /assets/ route to be more flexible
    CROW_ROUTE(app, "/<path>")
    .methods(crow::HTTPMethod::GET)
    ([clean_path](const crow::request& req, crow::response& res, std::string path){
        // Prevent path traversal
        if (path.find("..") != std::string::npos) {
            res.code = 400;
            res.end();
            return;
        }

        std::string full_path = clean_path + "/" + path;
        
        // If it's a directory or doesn't exist, Crow will continue to Catchall/SPA fallback
        if (!std::filesystem::exists(full_path) || std::filesystem::is_directory(full_path)) {
            res.code = 404;
            res.end();
            return;
        }

        std::ifstream file(full_path, std::ios::binary);
        if (!file.is_open()) {
            res.code = 404;
            res.end();
            return;
        }

        std::stringstream buffer;
        buffer << file.rdbuf();
        res.body = buffer.str();
        
        // Content-Type mapping
        if (full_path.ends_with(".js")) res.set_header("Content-Type", "application/javascript");
        else if (full_path.ends_with(".css")) res.set_header("Content-Type", "text/css");
        else if (full_path.ends_with(".svg")) res.set_header("Content-Type", "image/svg+xml");
        else if (full_path.ends_with(".png")) res.set_header("Content-Type", "image/png");
        else if (full_path.ends_with(".ico")) res.set_header("Content-Type", "image/x-icon");
        else if (full_path.ends_with(".jpg") || full_path.ends_with(".jpeg")) res.set_header("Content-Type", "image/jpeg");
        
        res.end();
    });

    // --- SPA Fallback ---
    // Serve index.html for any unknown routes so React Router can handle them
    CROW_CATCHALL_ROUTE(app)
    ([clean_path](const crow::request& req, crow::response& res){
        if (req.url.find("/api/") != std::string::npos) {
            res.code = 404;
            res.end();
            return;
        }
        
        std::string full_path = clean_path + "/index.html";
        std::ifstream file(full_path);
        if (file.is_open()) {
            std::stringstream buffer;
            buffer << file.rdbuf();
            res.set_header("Content-Type", "text/html");
            res.write(buffer.str());
        } else {
            res.code = 404;
            res.write("Not Found");
        }
        res.end();
    });

    // --- WebSockets ---
    CROW_WEBSOCKET_ROUTE(app, "/ws/events")
    .onopen([this](crow::websocket::connection& conn){
        std::lock_guard<std::mutex> lock(m_usersMutex);
        m_users.insert(&conn);
    })
    .onclose([this](crow::websocket::connection& conn, const std::string& /*reason*/){
        std::lock_guard<std::mutex> lock(m_usersMutex);
        m_users.erase(&conn);
    });

    // --- Register Detection Callback ---
    m_streamManager->setDetectionCallback([this](const DetectionEvent& event, const std::string& webhook_response){
        crow::json::wvalue x;
        x["type"] = "detection";
        x["id"] = event.id;
        x["camera_id"] = event.camera_id;
        x["timestamp"] = event.timestamp;
        x["label"] = event.label;
        x["confidence"] = event.confidence;
        x["webhook_response"] = webhook_response;

        std::string msg = x.dump();
        
        std::lock_guard<std::mutex> lock(m_usersMutex);
        for (auto user : m_users) {
            user->send_text(msg);
        }
    });

    std::cout << "[Web] Starting server on port " << port << " (bound to 0.0.0.0)" << std::endl;
    app.port(port).bindaddr("0.0.0.0").multithreaded().run();
}

} // namespace vms
