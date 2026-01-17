# Background & Context: Hue SpatialAware (2026)

## Source Material Analysis

### 1. Philips Hue "SpatialAware" (Official/Press Info)
**Status:** Announced Jan 7, 2026.
**Hardware Requirement:** Hue Bridge Pro.
**Core Concept:** Replaces random/linear color assignment with **3D Volumetric Mapping**.

#### Key Features
*   **AR Scanning:** Uses phone camera + AR (LiDAR/ARKit/ARCore) to scan the room boundaries.
*   **Positional Harmonization:**
    *   **Verticality:** Distinguishes ceiling lights (Sky) from floor lamps (Ground).
    *   **Directionality:** Recognizes Strip (Linear) vs. Bulb (Point) sources.
    *   **Proximity:** Lights near each other blend; lights far apart contrast.
*   **Example Scenario:** "Savanna Sunset"
    *   East Wall: Deep Purple (Night).
    *   West Wall: Bright Orange/Red (Sunset).
    *   Ceiling: Twilight Blue.

#### Marketing Description
> Hue SpatialAware scenes enable you to bring nature into your home, recreating natural light settings with remarkable realism by understanding the position of each light. This results in lighting that feels more immersive, dynamic and true to life.
>
> Currently, when using preset scenes from the Scene Gallery in the Philips Hue app, colors are distributed without knowledge of their relative positions across the products in a room. With Hue SpatialAware scenes, colors are distributed intentionally across all the lights in the room to create the most natural representation.

### 2. The "2026" AI Landscape (Projected/Current SOTA)
To replicate this *without* relying on phone sensors (IMU/LiDAR), we must rely on **Computer Vision (CV)** and **Deep Learning**.

#### Relevant Technologies (2024-2025 SOTA)
*   **Monocular Depth Estimation:**
    *   *Depth Anything V2 / Depth Pro:* Capable of zero-shot metric depth estimation from single images. fast and sharp borders.
*   **Visual SLAM (Simultaneous Localization and Mapping):**
    *   *DROID-SLAM:* Deep learning-based SLAM that is more robust than traditional ORB-SLAM.
    *   *Gaussian Splatting:* Real-time radiance field rendering. While mostly for visualization, the underlying sparse point cloud is useful for structure.
*   **3D Scene Understanding:**
    *   Techniques to segment "Floor", "Walls", "Ceiling" from a 3D point cloud or depth map.

## Project Goal: "Home Assistant SpatialAware"
**Objective:** Create a Home Assistant Add-on (or companion service) that provides 3D volumetric lighting control for *any* HA-controlled light.

**Constraints:**
*   **Input:** "JUST THE CAMERA". No phone orientation data, no LiDAR.
*   **Hardware Architecture:**
    *   **The "Director" (Runtime):** Must be lightweight and run on a standard HA instance (Raspberry Pi 4/5).
    *   **The "Mapper" (Setup):** Can offload heavy processing to a separate powerful machine (Desktop GPU / API calls).
*   **Scope:** Map the room -> Locate the Lights -> Apply 3D Scenes.

## Research Questions
1.  **Light Localization:** How to map a physical light bulb to a pixel in the video, and then to a 3D coordinate?
    *   *Idea:* "Flash Calibration". Turn off all lights. Flash Light A. Detect bright cluster in video. Raycast to 3D model. Repeat.
2.  **Room Geometry:** We need a coordinate system (0,0,0 at center of floor?).
3.  **Spatial Engine:** How to translate a "Scene" (e.g., a function `f(x,y,z) -> RGB`) to discrete light entities.
4.  **AI Strategy:** Can Multimodal LLMs (Gemini, GPT-4o) replace traditional SLAM for understanding relative light positions from a video tour?
