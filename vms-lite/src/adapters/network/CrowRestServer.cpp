#include "CrowRestServer.hpp"
#include "crow_all.h"
#include <iostream>

namespace vms {

CrowRestServer::CrowRestServer(
    std::shared_ptr<ICameraRepository> repository,
    std::shared_ptr<StreamManager> stream_manager
) : m_repository(repository), m_streamManager(stream_manager) {}

CrowRestServer::~CrowRestServer() {}

void CrowRestServer::run(int port) {
    crow::SimpleApp app;

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
            return crow::response(201);
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
    // Decision 5: Serve from visionguard/client/dist
    CROW_ROUTE(app, "/")
    ([](const crow::request&, crow::response& res){
        res.set_static_file_info("/home/yolo/developl/LilinVision/visionguard/client/dist/index.html");
        res.end();
    });

    // Catch-all for other static assets
    CROW_ROUTE(app, "/assets/<path>")
    ([](const crow::request&, crow::response& res, std::string path){
        res.set_static_file_info("/home/yolo/developl/LilinVision/visionguard/client/dist/assets/" + path);
        res.end();
    });

    std::cout << "[Web] Starting server on port " << port << std::endl;
    app.port(port).multithreaded().run();
}

} // namespace vms
