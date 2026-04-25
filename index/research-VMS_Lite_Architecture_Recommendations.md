<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# VMS Lite Software Architecture Recommendations

## Overview

This document consolidates recommendations for building a maintainable, upgradable VMS Lite system based on the provided architecture. The system uses a C++17 inference engine with Darknet/DarkHelp for RTSP stream processing and object detection, SQLite for configuration, REST API for management, and React/Electron frontend. Key goals are long-term maintainability and upgradeability across inference backends, databases, UI frameworks, and external integrations.

## Core Architecture Recommendation

**Use Clean Architecture with Hexagonal/Ports-and-Adapters boundaries** as the primary organizing principle. This keeps core business logic (camera management, detection rules, event generation) independent from frameworks, libraries, and external concerns.

### Layered Structure

```
Domain Layer (Pure C++)
├── Camera (entities)
├── StreamSession  
├── DetectionRule
├── DetectionEvent
└── EndpointConfig

Application Layer (Use Cases)
├── AddCameraUseCase
├── RemoveCameraUseCase
├── StartStreamUseCase
├── EvaluateDetectionRuleUseCase
└── PublishDetectionEventUseCase

Ports/Interfaces (Abstractions)
├── ICameraRepository
├── IInferenceService
├── IStreamSource
├── IEventPublisher
├── ISettingsStore
└── IRealtimeNotifier

Infrastructure/Adapters (Framework-specific)
├── SQLiteCameraRepository
├── DarkHelpInferenceAdapter    ← Swappable
├── OpenCVRTSPStreamAdapter
├── CrowRestServerAdapter
├── WebSocketBroadcaster
└── HttpEventPublisher (libcurl)
```


### Why This Works for VMS Lite

1. **Inference engine isolation**: Darknet/DarkHelp becomes one `IInferenceService` implementation
2. **Database flexibility**: SQLite today, PostgreSQL tomorrow via new `ICameraRepository`
3. **UI framework agnostic**: REST + WebSocket contracts let you swap Electron/Tauri/browser
4. **External API evolution**: `IEventPublisher` hides POST payload format changes
5. **Testability**: Mock interfaces for unit testing core logic

## Critical: Make DarkHelp Just One Adapter

**Never let DarkHelp/Darknet become your application contract.** Instead, define a clean `IInferenceService` interface that your core application layer depends on:

```cpp
class IInferenceService {
public:
    virtual ~IInferenceService() = default;
    virtual bool loadModel(const std::string& configPath, 
                          const std::string& weightsPath,
                          const std::string& namesPath) = 0;
    virtual std::vector<Detection> infer(const cv::Mat& frame) = 0;
    virtual std::vector<std::string> getLabels() const = 0;
    virtual void warmup() = 0;
    virtual bool isReady() const = 0;
};
```

**DarkHelpInferenceAdapter.cpp**:

```cpp
class DarkHelpInferenceAdapter : public IInferenceService {
private:
    DarkHelp::NN m_darkhelp;
public:
    bool loadModel(...) override {
        // DarkHelp-specific loading
        return m_darkhelp.setup(cfg, weights, names);
    }
    
    std::vector<Detection> infer(const cv::Mat& frame) override {
        // DarkHelp-specific inference
        m_darkhelp.detectWithinImage(frame);
        return convertDarkHelpResults(m_darkhelp);
    }
};
```

**Future ONNX Runtime Adapter** (drop-in replacement):

```cpp
class OnnxRuntimeInferenceAdapter : public IInferenceService {
    // Same public interface, totally different implementation
};
```

This makes inference backend swaps **purely additive** - add new adapter, flip config, done.

## Engineering Standards

| Category | Standard | Tool |
| :-- | :-- | :-- |
| **Code Style** | Google C++ Style Guide | clang-format |
| **Static Analysis** | Modern C++ checks | clang-tidy, cppcheck |
| **Build** | CMake with clear targets | CPack for .deb |
| **Testing** | GoogleTest + contract tests | Catch2 for adapters |
| **Memory** | **Zero-copy frame passing** | `std::shared_ptr<cv::Mat>` |
| **Concurrency** | **One Thread per Camera** | `std::jthread` (C++20) or `std::thread` |
| **Error Handling**| Functional Result pattern | `std::optional` or `expected` |
| **API Versioning** | Semantic versioning | /v1/cameras → /v2/cameras |
| **Documentation** | Architecture Decision Records | docs/adr/ |

## Performance & Concurrency Strategy

To maintain the high performance required for real-time video, follow these implementation rules:

1. **Zero-Copy Pipeline**: The `IStreamSource` adapter should produce frames as `std::shared_ptr<cv::Mat>`. Pass this pointer through the `Application Layer` to the `IInferenceService`. Never clone image data unless post-processing requires a destructive modification.
2. **Worker Isolation (One Thread per Camera)**: Each camera session should be managed by a dedicated worker thread (encapsulated in a `StreamSession` entity). This prevents a slow RTSP stream or a heavy inference load on one camera from starving other channels.
3. **Async Inference Queues**: If the inference engine (DarkHelp) is slower than the RTSP framerate, implement a single-slot "drop-oldest" queue in the adapter to ensure the AI always processes the most recent "live" frame.

## Upgrade Strategy

Design these common future changes to touch **only outer adapters**:


| Change | Impact | Adapter Affected |
| :-- | :-- | :-- |
| Darknet → ONNX/TensorRT | `IInferenceService` impl | DarkHelpInferenceAdapter |
| SQLite → PostgreSQL | `ICameraRepository` impl | SQLiteCameraRepository |
| Electron → Tauri | New frontend client | None (REST contract unchanged) |
| New external VMS API | `IEventPublisher` impl | HttpEventPublisher |
| Add ONVIF support | New `IStreamSource` impl | OpenCVRTSPStreamAdapter |

## Module Organization

```
vms-lite/
├── src/
│   ├── domain/           # Pure entities (Camera, DetectionEvent)
│   ├── application/      # Use cases (AddCameraUseCase)
│   ├── ports/            # Interfaces (IInferenceService)
│   ├── adapters/         # Framework impls
│   │   ├── inference/
│   │   │   └── DarkHelpInferenceAdapter.cpp
│   │   ├── storage/
│   │   └── network/
│   └── main.cpp          # Wiring + service startup
├── tests/
├── gui/                  # React/Electron (separate repo recommended)
├── packaging/            # CMake/CPack configs
└── docs/adr/             # Architecture decisions
```


## Implementation Priority

1. **Define all ports/interfaces first** (especially `IInferenceService`)
2. **Implement DarkHelp as v1 adapter** (don't touch core)
3. **Wire up application services** using interfaces only
4. **Add SQLite, OpenCV, Crow adapters**
5. **Build React GUI against REST/WebSocket contracts**

## Success Metrics

- Can swap inference backends without touching application layer
- Can run integration tests with mock `IInferenceService`
- Frontend doesn't know Darknet/OpenCV/SQLite exist
- New team member can add ONVIF support in one adapter
- `.deb` packages cleanly with systemd integration

This architecture gives you **professional-grade maintainability** while staying true to your high-performance C++ backend + modern web UI vision. The key insight: **make every library swappable by design, starting Day 1**.

