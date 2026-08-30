import json

# Manual overrides to guarantee absolute correctness for preparations and recognition
overrides = {
    "001_H.json": {
        "preparations": {
            "lab": [
                {
                    "title": "Kim loại tác dụng với dung dịch acid loãng",
                    "equation": "Zn + 2HCl(loãng) → ZnCl2 + H2↑ <br> Fe + H2SO4(loãng) → FeSO4 + H2↑"
                }
            ],
            "industry": [
                {
                    "title": "Điện phân nước",
                    "equation": "2H2O → 2H2↑ + O2↑"
                },
                {
                    "title": "Công nghệ chuyển hóa hydrocarbon",
                    "equation": "CH4 + H2O → CO + 3H2↑ (giai đoạn 1) <br> CO + H2O → CO2 + H2↑ (giai đoạn 2)"
                },
                {
                    "title": "Dùng than khử oxi của H2O ở nhiệt độ cao",
                    "equation": "C + H2O → CO + H2↑"
                }
            ]
        },
        "recognition": [
            {
                "title": "Cách 1: Dùng bột CuO đun nóng",
                "reagent": "Cho khí đi qua CuO nung nóng.",
                "result": "Chất rắn màu đen (CuO) chuyển dần sang màu đỏ (Cu).",
                "equation": "CuO + H2 → Cu + H2O"
            },
            {
                "title": "Cách 2: Thử bằng que đốm",
                "reagent": "Đưa que đốm đang cháy vào bình chứa khí.",
                "result": "Khí H2 cháy trong không khí cho ngọn lửa màu xanh nhạt và tỏa nhiều nhiệt.",
                "equation": "2H2 + O2 → 2H2O"
            }
        ]
    },
    "011_Na.json": {
        "preparations": {
            "lab": [
                {
                    "title": "Hầu như không được điều chế trong phòng thí nghiệm",
                    "equation": ""
                }
            ],
            "industry": [
                {
                    "title": "Điện phân nóng chảy Sodium chloride (NaCl)",
                    "equation": "2NaCl → 2Na + Cl2↑",
                    "condition": "đpnc"
                }
            ]
        },
        "recognition": [
            {
                "title": "Thử màu ngọn lửa",
                "reagent": "Đốt cháy các hợp chất của Natri trên ngọn lửa đèn cồn.",
                "result": "Hợp chất của Sodium cháy với ngọn lửa có màu vàng đặc trưng.",
                "equation": ""
            }
        ]
    },
    "019_K.json": {
        "preparations": {
            "lab": [
                {
                    "title": "Hầu như không được điều chế trong phòng thí nghiệm",
                    "equation": ""
                }
            ],
            "industry": [
                {
                    "title": "Điện phân nóng chảy Potassium hydroxide (KOH)",
                    "equation": "4KOH → 4K + O2↑ + 2H2O",
                    "condition": "đpnc"
                },
                {
                    "title": "Điện phân nóng chảy Potassium chloride (KCl)",
                    "equation": "2KCl → 2K + Cl2↑",
                    "condition": "đpnc"
                },
                {
                    "title": "Khử KCl bằng Natri ở nhiệt độ cao",
                    "equation": "KCl + Na → NaCl + K",
                    "condition": "t°"
                }
            ]
        },
        "recognition": [
            {
                "title": "Thử màu ngọn lửa",
                "reagent": "Đốt cháy các hợp chất của Potassium.",
                "result": "Hợp chất của Potassium cháy với ngọn lửa màu tím đặc trưng.",
                "equation": ""
            }
        ]
    },
    "012_Mg.json": {
        "preparations": {
            "lab": [
                {
                    "title": "Hầu như không được điều chế trong phòng thí nghiệm",
                    "equation": ""
                }
            ],
            "industry": [
                {
                    "title": "Điện phân nóng chảy Magnesium chloride (MgCl2)",
                    "equation": "MgCl2 → Mg + Cl2↑",
                    "condition": "đpnc"
                },
                {
                    "title": "Phương pháp Pidgeon (Khử quặng Dolomite)",
                    "equation": "CaCO3⋅MgCO3 → CaO⋅MgO + 2CO2↑ (Giai đoạn 1) <br> 2MgO + 2CaO + Si → 2Mg↑ + Ca2SiO4 (Giai đoạn 2)",
                    "condition": "1200°C, chân không"
                }
            ]
        },
        "recognition": [
            {
                "title": "Thử bằng ngọn lửa",
                "reagent": "Đốt cháy dây Magnesium trên ngọn lửa đèn cồn.",
                "result": "Magnesium cháy với ngọn lửa màu trắng chói lòa.",
                "equation": "2Mg + O2 → 2MgO",
                "condition": "t°"
            }
        ]
    },
    "020_Ca.json": {
        "preparations": {
            "lab": [
                {
                    "title": "Hầu như không được điều chế trong phòng thí nghiệm",
                    "equation": ""
                }
            ],
            "industry": [
                {
                    "title": "Điện phân nóng chảy Calcium chloride (CaCl2)",
                    "equation": "CaCl2 → Ca + Cl2↑",
                    "condition": "đpnc"
                },
                {
                    "title": "Phương pháp Nhiệt nhôm",
                    "equation": "CaCO3 → CaO + CO2↑ (Giai đoạn 1) <br> 6CaO + 2Al → 3Ca↑ + 3CaO⋅Al2O3 (Giai đoạn 2)",
                    "condition": "t°, chân không"
                }
            ]
        },
        "recognition": [
            {
                "title": "Thử màu ngọn lửa",
                "reagent": "Đốt cháy các hợp chất của Calcium.",
                "result": "Calcium cháy với ngọn lửa màu đỏ gạch.",
                "equation": ""
            }
        ]
    },
    "056_Ba.json": {
        "preparations": {
            "lab": [
                {
                    "title": "Hầu như không được điều chế trong phòng thí nghiệm",
                    "equation": ""
                }
            ],
            "industry": [
                {
                    "title": "Điện phân nóng chảy Barium chloride (BaCl2)",
                    "equation": "BaCl2 → Ba + Cl2↑",
                    "condition": "đpnc"
                },
                {
                    "title": "Phương pháp nhiệt nhôm trong chân không",
                    "equation": "BaCO3 → BaO + CO2↑ (Giai đoạn 1) <br> 3BaO + 2Al → 3Ba↑ + Al2O3 (Giai đoạn 2)",
                    "condition": "t°, chân không"
                }
            ]
        },
        "recognition": [
            {
                "title": "Thử màu ngọn lửa",
                "reagent": "Đốt muối Barium trên ngọn lửa đèn cồn hoặc đèn Bunsen.",
                "result": "Ngọn lửa có màu xanh lục (xanh táo) đặc trưng.",
                "equation": ""
            }
        ]
    },
    "013_Al.json": {
        "preparations": {
            "lab": [
                {
                    "title": "Hầu như không được điều chế trong phòng thí nghiệm",
                    "equation": ""
                }
            ],
            "industry": [
                {
                    "title": "Điện phân nóng chảy Al2O3",
                    "equation": "2Al2O3 → 4Al + 3O2↑",
                    "condition": "đpnc, criolit"
                },
                {
                    "title": "Tinh chế quặng Bauxite",
                    "equation": "Al2O3 + 2NaOH → 2NaAlO2 + H2O (Giai đoạn 1) <br> NaAlO2 + CO2 + 2H2O → Al(OH)3↓ + NaHCO3 (Giai đoạn 2) <br> 2Al(OH)3 → Al2O3 + 3H2O (Giai đoạn 3)",
                    "condition": "t°"
                }
            ]
        },
        "recognition": [
            {
                "title": "Phản ứng với kiềm",
                "reagent": "Cho Aluminium phản ứng với dung dịch NaOH hoặc KOH.",
                "result": "Aluminium tan dần, sinh ra khí không màu sủi bọt.",
                "equation": "2Al + 2NaOH + 2H2O → 2NaAlO2 + 3H2↑"
            }
        ]
    },
    "006_C.json": {
        "preparations": {
            "lab": [
                {
                    "title": "Hầu như không được điều chế trong phòng thí nghiệm",
                    "equation": ""
                }
            ],
            "industry": [
                {
                    "title": "Chưng khô than đá",
                    "equation": "Than đá → Than cốc (~80% C) + Hắc ín + Khí lò cốc",
                    "condition": "1000°C - 1100°C, không có không khí"
                },
                {
                    "title": "Nhiệt phân khí metan",
                    "equation": "CH4 → C (rắn, mịn) + 2H2↑",
                    "condition": "t° ≥ 1000°C"
                },
                {
                    "title": "Lắng đọng hơi hóa học (CVD)",
                    "equation": "CH4 → C (kim cương) + 4H•",
                    "condition": "Năng lượng Plasma"
                }
            ]
        },
        "recognition": [
            {
                "title": "Thử tính chất cháy",
                "reagent": "Nung nóng mẫu bột đen trong Oxi, sau đó dẫn khí sinh ra vào dung dịch nước vôi trong (Ca(OH)2) dư.",
                "result": "Mẫu bột cháy sáng sinh ra khí. Khí này làm vẩn đục nước vôi trong (tạo kết tủa trắng).",
                "equation": "C + O2 → CO2 <br> CO2 + Ca(OH)2 → CaCO3↓ + H2O",
                "condition": "t°"
            }
        ]
    }
}

for filename, data in overrides.items():
    filepath = f"data/elements/{filename}"
    with open(filepath, 'r', encoding='utf-8') as f:
        j = json.load(f)
    
    j['preparations'] = data['preparations']
    j['recognition'] = data['recognition']
    
    # Fix typos in notes (e.g. Calsium -> Calcium)
    if 'notes' in j:
        j['notes'] = j['notes'].replace('Calsium', 'Calcium')
        j['notes'] = j['notes'].replace('calsium', 'calcium')
        j['notes'] = j['notes'].replace('Calsium', 'Calcium') # double replace just in case
        
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(j, f, ensure_ascii=False, indent=2)

print("Manual overrides applied.")
