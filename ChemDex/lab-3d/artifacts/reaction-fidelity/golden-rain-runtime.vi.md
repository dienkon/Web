# Kiểm tra Golden Rain với hiệu ứng vật lý

Trạng thái: **complete**; thời gian mô phỏng 2238.9 s; tính toán 254.8 s.

| Kiểm tra | Kết quả |
| --- | --- |
| completed | Đạt |
| noError | Đạt |
| reachedDissolution | Đạt |
| coolingCreatedPlates | Đạt |
| settledAtLeast90Percent | Đạt |
| massConservedWithin10Micrograms | Đạt |
| leadIodideConservedWithin1Nanomol | Đạt |
| representedSolidConservedWithin10Nanograms | Đạt |
| renderedWithinBudget | Đạt |
| physicalClockCaughtUp | Đạt |

| Thời gian (s) | Pha | Nhiệt độ (°C) | PbI₂ rắn (g) | Phiến (g) | Đã lắng |
| --- | --- | --- | --- | --- | --- |
| 0.1 | prepare | 25.00 | 0.0000 | 0.0000 | 0.0% |
| 1.7 | carry | 25.00 | 0.0000 | 0.0000 | 0.0% |
| 3.7 | dose | 25.00 | 0.0000 | 0.0000 | 0.0% |
| 6.9 | return | 25.00 | 0.0000 | 0.0000 | 0.0% |
| 9.0 | carry | 24.99 | 0.0000 | 0.0000 | 0.0% |
| 11.0 | dose | 24.99 | 0.0000 | 0.0000 | 0.0% |
| 30.5 | return | 24.96 | 0.0000 | 0.0000 | 0.0% |
| 32.5 | carry | 24.96 | 0.0000 | 0.0000 | 0.0% |
| 34.6 | dose | 24.95 | 0.0000 | 0.0000 | 0.0% |
| 49.8 | return | 25.03 | 0.089383 | 0.0000 | 0.0% |
| 51.9 | condition | 25.03 | 0.095145 | 0.0000 | 0.0% |
| 55.9 | react | 25.03 | 0.095137 | 0.0000 | 0.0% |
| 58.6 | condition | 25.12 | 0.095146 | 0.0000 | 0.0% |
| 95.2 | cool | 90.02 | 0.0000 | 0.0000 | 0.0% |
| 2230.8 | settle | 28.00 | 0.091029 | 0.091029 | 100.0% |
| 2230.9 | observe | 28.00 | 0.091030 | 0.091030 | 100.0% |
| 2238.9 | complete | 27.97 | 0.091078 | 0.091078 | 100.0% |

Sai số khối lượng cực đại: 1.563e-13 g. Sai lệch rắn được đại diện: 1.681e-14 g.
Số parcel vật lý tối đa: 128; số hạt được chọn vẽ tối đa: 128/550.

- Headless state audit does not validate pixels, glass transparency or UI overlays.
- The PbI2 water-solubility curve and precipitation relaxation rates are proxies; plate drag/growth are not fitted experimental kinetics.
