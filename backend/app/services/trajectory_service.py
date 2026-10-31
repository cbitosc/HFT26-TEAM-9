import numpy as np
from typing import List, Dict, Any, Optional

class TrajectoryEngine:
    """
    Interpolates vehicle kinematic waypoints into smooth 3D coordinates for Three.js WebGL rendering.
    Supports dynamic collision scenarios:
    1. Intersection T-bone / Angle Collision (Car vs Motorcycle or Car vs SUV)
    2. Highway Rear-End Collision (Lead vehicle sudden deceleration, follower impact)
    3. Head-On Collision (Opposite lane crossover)
    4. Blindspot Side-Swipe / Lane Merge Collision
    """

    @staticmethod
    def generate_intersection_trajectory(vehicle_b_type: str = "MOTORCYCLE") -> List[Dict[str, Any]]:
        """
        4-Way intersection angle collision:
        - Vehicle A (Sedan): Traveling Westbound (-X to +X) along Z=1.75
        - Vehicle B (Motorcycle / SUV): Traveling Southbound (-Z to +Z) along X=1.75
        - Impact at t=2.8s near (1.5, 0.5)
        """
        frames = []
        times = np.arange(0.0, 4.3, 0.1)

        for t in times:
            t = round(float(t), 2)
            
            # Vehicle A: Starts at x = -25m, moving at ~13.3 m/s (48 km/h)
            if t < 2.0:
                xA = -25.0 + (t * 11.5)
                speedA = 48.0
                brakingA = False
                headingA = 90.0
                zA = 1.75
            elif t < 2.8:
                xA = -2.0 + ((t - 2.0) * 4.375)
                speedA = 48.0 - ((t - 2.0) * 28.0)
                brakingA = True
                headingA = 90.0
                zA = 1.75
            else:
                dt = t - 2.8
                xA = 1.5 + (dt * 1.5)
                zA = 1.75 + (dt * 0.7)
                speedA = max(0.0, 25.0 - (dt * 18.0))
                brakingA = True
                headingA = max(70.0, 90.0 - (dt * 15.0))

            # Vehicle B: Lorry / Truck or Motorcycle or SUV
            if vehicle_b_type == "LORRY":
                if t < 2.7:
                    xB = 1.6
                    zB = -26.0 + (t * 8.9)
                    speedB = 32.0
                    brakingB = False
                    headingB = 180.0
                    bankB = 0.0
                else:
                    dt = t - 2.7
                    xB = 1.6
                    zB = -1.97 + min(3.8, dt * 2.4)
                    speedB = max(0.0, 22.0 - (dt * 18.0))
                    brakingB = True
                    headingB = 180.0
                    bankB = float(0.04 * np.sin(dt * 7.0) * np.exp(-dt * 2.5))
            else:
                if t < 2.8:
                    xB = 1.75
                    zB = -25.0 + (t * 9.1)
                    speedB = 36.0
                    brakingB = False
                    headingB = 180.0
                    bankB = 0.0
                else:
                    dt = t - 2.8
                    xB = 1.75 + (dt * 1.8)
                    zB = 0.5 + (dt * 2.1)
                    speedB = max(0.0, 30.0 - (dt * 22.0))
                    brakingB = True
                    headingB = max(140.0, 180.0 - (dt * 30.0))
                    bankB = min(1.3, dt * 1.3)

            # Signal state
            if t < 1.4:
                tl = "GREEN"
            elif t < 2.1:
                tl = "YELLOW"
            else:
                tl = "RED"

            is_impact = (2.7 <= t <= 2.9)

            frames.append({
                "timeSec": t,
                "scenario": "INTERSECTION_TBONE",
                "vehicleA": {
                    "type": "SEDAN",
                    "x": round(float(xA), 2),
                    "z": round(float(zA), 2),
                    "speedKmh": round(float(speedA), 1),
                    "headingDeg": round(float(headingA), 1),
                    "braking": brakingA,
                    "uncertaintyRadiusMeters": 0.4 if t < 2.8 else 0.8
                },
                "vehicleB": {
                    "type": vehicle_b_type,
                    "x": round(float(xB), 2),
                    "z": round(float(zB), 2),
                    "speedKmh": round(float(speedB), 1),
                    "headingDeg": round(float(headingB), 1),
                    "bankRoll": round(float(bankB), 2),
                    "braking": brakingB,
                    "uncertaintyRadiusMeters": 0.5 if t < 2.8 else 0.9
                },
                "trafficLight": tl,
                "isImpactPoint": is_impact
            })

        return frames

    @staticmethod
    def generate_rear_end_trajectory() -> List[Dict[str, Any]]:
        """
        Highway multi-vehicle rear-end collision:
        - Vehicle A (Lead Blue SUV): Cruising at 80 km/h, slams brakes at t=1.0s to avoid hazard
        - Vehicle B (Follower Red Sedan): Traveling behind at 95 km/h, delayed reaction, crashes into rear of Vehicle A at t=2.6s
        """
        frames = []
        times = np.arange(0.0, 4.3, 0.1)

        # Both vehicles travel along X axis in lane (Z = 0)
        for t in times:
            t = round(float(t), 2)

            # Lead Vehicle A (starts forward at X = 0)
            if t < 1.0:
                xA = 0.0 + (t * 22.0)
                speedA = 80.0
                brakingA = False
            elif t < 2.6:
                dt = t - 1.0
                xA = 22.0 + (dt * 14.0)
                speedA = max(20.0, 80.0 - (dt * 37.5))
                brakingA = True
            else:
                dt = t - 2.6
                xA = 44.4 + (dt * 8.0) # Pushed forward by impact
                speedA = max(0.0, 35.0 - (dt * 20.0))
                brakingA = True

            # Trailing Vehicle B (starts behind at X = -28m)
            if t < 1.8:
                xB = -28.0 + (t * 26.0) # 95 km/h
                speedB = 95.0
                brakingB = False
            elif t < 2.6:
                dt = t - 1.8
                xB = 18.8 + (dt * 20.0)
                speedB = 95.0 - (dt * 35.0)
                brakingB = True
            else:
                dt = t - 2.6
                xB = 39.8 + (dt * 7.5) # Impact bumper compression
                speedB = max(0.0, 32.0 - (dt * 22.0))
                brakingB = True

            is_impact = (2.5 <= t <= 2.7)

            frames.append({
                "timeSec": t,
                "scenario": "HIGHWAY_REAR_END",
                "vehicleA": {
                    "type": "SUV",
                    "x": round(float(xA - 25.0), 2),
                    "z": 0.0,
                    "speedKmh": round(float(speedA), 1),
                    "headingDeg": 90.0,
                    "braking": brakingA
                },
                "vehicleB": {
                    "type": "SEDAN",
                    "x": round(float(xB - 25.0), 2),
                    "z": 0.0,
                    "speedKmh": round(float(speedB), 1),
                    "headingDeg": 90.0,
                    "braking": brakingB
                },
                "trafficLight": "NONE",
                "isImpactPoint": is_impact
            })

        return frames

    @staticmethod
    def generate_head_on_trajectory() -> List[Dict[str, Any]]:
        """
        Two-lane rural road head-on collision:
        - Vehicle A: Traveling East along X (+X) in lane Z = 2.0
        - Vehicle B: Traveling West along X (-X) in lane Z = -2.0, drifts into oncoming lane Z = 1.8 at t=1.8s
        - Frontal collision at t=2.6s near X = 0
        """
        frames = []
        times = np.arange(0.0, 4.3, 0.1)

        for t in times:
            t = round(float(t), 2)

            if t < 2.6:
                xA = -26.0 + (t * 10.0)
                zA = 2.0
                speedA = 50.0
                brakingA = t >= 2.0

                xB = 26.0 - (t * 10.0)
                # Vehicle B drifts across centerline starting at t=1.5
                if t < 1.5:
                    zB = -2.0
                else:
                    zB = -2.0 + ((t - 1.5) * 3.6) # Drifts towards Z=2.0
                speedB = 52.0
                brakingB = False
                rotA = 0.0
                rotB = np.pi
            else:
                dt = t - 2.6
                xA = 0.0 - (dt * 1.5)
                zA = 2.0 + (dt * 1.2)
                speedA = max(0.0, 15.0 - (dt * 12.0))
                brakingA = True

                xB = 0.0 + (dt * 1.8)
                zB = 2.0 - (dt * 1.0)
                speedB = max(0.0, 18.0 - (dt * 14.0))
                brakingB = True
                # Severe rotational spin upon head-on impact
                rotA = dt * 1.2
                rotB = np.pi - (dt * 1.4)

            is_impact = (2.5 <= t <= 2.7)

            frames.append({
                "timeSec": t,
                "scenario": "HEAD_ON",
                "vehicleA": {
                    "type": "SEDAN",
                    "x": round(float(xA), 2),
                    "z": round(float(zA), 2),
                    "speedKmh": round(float(speedA), 1),
                    "rotationY": round(float(rotA), 2),
                    "braking": brakingA
                },
                "vehicleB": {
                    "type": "SUV",
                    "x": round(float(xB), 2),
                    "z": round(float(zB), 2),
                    "speedKmh": round(float(speedB), 1),
                    "rotationY": round(float(rotB), 2),
                    "braking": brakingB
                },
                "trafficLight": "NONE",
                "isImpactPoint": is_impact
            })

        return frames

    @staticmethod
    def generate_default_intersection_trajectory() -> List[Dict[str, Any]]:
        return TrajectoryEngine.generate_intersection_trajectory("MOTORCYCLE")

trajectory_engine = TrajectoryEngine()
