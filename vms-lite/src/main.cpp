#include <iostream>
#include <memory>
#include <thread>
#include <chrono>
#include <string>
#include <filesystem>

#include <application/StreamManager.hpp>
#include <adapters/mock/MockAdapters.hpp>
#include <adapters/storage/SQLiteCameraRepository.hpp>
#include <adapters/network/CrowRestServer.hpp>

int main(int argc, char** argv) {
    bool use_mocks = false;
    std::string static_path = "";
    
    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--mock") {
            use_mocks = true;
        } else if (arg == "--gui" && i + 1 < argc) {
            static_path = argv[++i];
        }
    }

    // Auto-detect static path if not provided
    if (static_path.empty()) {
        std::vector<std::string> potential_paths = {
            "./LilinVision-Web/dist",                // Root
            "../LilinVision-Web/dist",               // vms-lite/
            "../../LilinVision-Web/dist",            // vms-lite/build/
            "/usr/share/vms-lite/www"                // Production
        };

        for (const auto& path : potential_paths) {
            if (std::filesystem::exists(path + "/index.html")) {
                static_path = path;
                break;
            }
        }
        
        if (static_path.empty()) static_path = "./www";
    }

    // Auto-detect Database path
    std::string db_path = "history.db";
    bool system_db_possible = std::filesystem::exists("/var/lib/vms-lite/");
    
    if (!use_mocks && system_db_possible) {
        std::string sys_path = "/var/lib/vms-lite/history.db";
        // Check if we can actually write to this directory
        std::error_code ec;
        auto status = std::filesystem::status("/var/lib/vms-lite/", ec);
        if (!ec && (status.permissions() & std::filesystem::perms::owner_write) != std::filesystem::perms::none) {
            db_path = sys_path;
        } else {
            std::cout << "[Config] System DB path not writable, using local history.db" << std::endl;
        }
    }

    // Auto-detect Model paths
    vms::ModelConfig model_config;
    std::vector<std::string> model_roots = {".", "..", "../..", "/usr/share/vms-lite/models"};
    bool model_found = false;

    for (const auto& root : model_roots) {
        std::string cfg = root + "/yoloweights/peoplerpeople/people.cfg";
        if (root == "/usr/share/vms-lite/models") cfg = root + "/people.cfg";

        if (std::filesystem::exists(cfg)) {
            if (root == "/usr/share/vms-lite/models") {
                model_config.configPath = root + "/people.cfg";
                model_config.weightsPath = root + "/people.weights";
                model_config.namesPath = root + "/people.names";
            } else {
                model_config.configPath = root + "/yoloweights/peoplerpeople/people.cfg";
                model_config.weightsPath = root + "/yoloweights/peoplerpeople/people.weights";
                model_config.namesPath = root + "/yoloweights/peoplerpeople/people.names";
            }
            model_found = true;
            break;
        }
    }

    if (!model_found) {
        model_config.configPath = "people.cfg";
        model_config.weightsPath = "people.weights";
        model_config.namesPath = "people.names";
    }

    std::cout << "--- VMS Lite ---" << std::endl;
    std::cout << "[Config] Static assets: " << static_path << std::endl;
    if (!use_mocks) {
        std::cout << "[Config] Database:      " << db_path << std::endl;
        std::cout << "[Config] Model Config:  " << model_config.configPath << std::endl;
    }
    
    if (use_mocks) std::cout << "[Mode] Running with MOCK adapters." << std::endl;
    else std::cout << "[Mode] Running with REAL adapters." << std::endl;

    // 1. Setup Infrastructure
    std::shared_ptr<vms::ICameraRepository> repository;
    if (use_mocks) {
        repository = std::make_shared<vms::MockCameraRepository>();
    } else {
        repository = std::make_shared<vms::SQLiteCameraRepository>(db_path);
        
        // Seed some real test cameras if DB is empty
        if (repository->getAllCameras().empty()) {
            vms::Camera c1;
            c1.name = "Test Camera";
            c1.rtsp_url = "rtsp://admin:password@192.168.1.10/stream1"; // Change to a real one for testing
            c1.is_enabled = true;
            repository->addCamera(c1);
        }
    }
    
    // 2. Initialize Stream Manager
    auto stream_manager = std::make_shared<vms::StreamManager>(repository, model_config);

    // 3. Initialize Web Server
    vms::CrowRestServer web_server(repository, stream_manager, static_path);

    // 4. Start all cameras in background
    std::cout << "[Main] Starting camera streams..." << std::endl;
    stream_manager->startAll();

    // 5. Run Web Server (Blocking)
    web_server.run(5000);

    // 6. Shutdown
    std::cout << "[Main] Shutting down..." << std::endl;
    stream_manager->stopAll();

    std::cout << "--- Done ---" << std::endl;
    return 0;
}
