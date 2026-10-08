import React from 'react';
import { InteractableItem } from '../InteractableItem';
import { InteractionManager } from '../InteractionManager';
import { useStore } from '../../../store/useStore';
import { PhaseEngine } from '../../../core/PhaseEngine';

export const InteractiveTasks: React.FC = () => {
  const currentPhase = useStore((s) => s.currentPhase);
  const tasks = useStore((s) => s.tasks);
  const player = useStore((s) => s.player);
  const completeTask = useStore((s) => s.completeTask);
  const startDialog = useStore((s) => s.startDialog);
  const setShowFireExtinguisherQuiz = useStore((s) => s.setShowFireExtinguisherQuiz);
  const setShowBandageQuiz = useStore((s) => s.setShowBandageQuiz);
  const setShowChemicalSymbolsQuiz = useStore((s) => s.setShowChemicalSymbolsQuiz);

  const isTaskDone = (id: string) => !!tasks.find((t) => t.id === id)?.completed;

  const handleTeacherClick = () => {
    const state = useStore.getState();
    const { seq, onComplete } = PhaseEngine.getTeacherDialog(
      state.currentPhase,
      state.tasks,
      state.player,
      state.completeTask,
      state.setCurrentPhase,
      state.endGame
    );
    startDialog(seq, onComplete);
  };

  return (
    <group>
      {/* 1. Global Interaction Manager checking nearest object each frame */}
      <InteractionManager />

      {/* ================= GIAI ĐOẠN 1: CHUẨN BỊ & PPE ================= */}
      {/* Task: Nói chuyện với thầy giáo (teacher.glb tại 0, 0, -4.5) */}
      <InteractableItem
        id="teacher_talk"
        position={[0.0, 0, -4.5]}
        label="Nói chuyện với Thầy giáo (Phím E / Click)"
        type="action"
        taskId="task_talk"
        dialogCallback={handleTeacherClick}
        isGlowing={!isTaskDone('task_talk')}
      >
        <group position={[0, 1.2, 0]}>
          <mesh visible={false}>
            <boxGeometry args={[0.9, 1.9, 0.9]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        </group>
      </InteractableItem>

      {/* Task: Đọc bảng nội quy an toàn trên tường Tây */}
      <InteractableItem
        id="rules_board"
        position={[-9.85, 1.8, 5.0]}
        label="Đọc Bảng Nội Quy An Toàn (Phím E)"
        type="learn"
        ruleId={1}
        taskId="task_rules"
        isGlowing={isTaskDone('task_talk') && !isTaskDone('task_rules')}
      >
        <group>
          <mesh visible={false}>
            <boxGeometry args={[0.3, 1.4, 2.0]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        </group>
      </InteractableItem>

      {/* Task: Kiểm tra giày kín mũi tại thảm cửa vào */}
      <InteractableItem
        id="shoes_mat"
        position={[-6.0, 0.05, 6.8]}
        label="Kiểm tra giày kín mũi tại Thảm (Phím E)"
        type="action"
        taskId="task_shoes"
        equipKey="hasClosedShoes"
        successMessage="Đã xác nhận mang giày thể thao / giày bảo hộ kín mũi đạt chuẩn an toàn phòng thí nghiệm!"
        isGlowing={!isTaskDone('task_shoes')}
      >
        <group>
          <mesh visible={false}>
            <boxGeometry args={[1.6, 0.1, 1.2]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        </group>
      </InteractableItem>

      {/* Task: Buộc tóc gọn gàng trước gương */}
      <InteractableItem
        id="mirror_hair"
        position={[-3.0, 1.5, 7.1]}
        label="Buộc tóc gọn gàng trước gương (Phím E)"
        type="action"
        taskId="task_hair"
        equipKey="hairTied"
        successMessage="Đã buộc tóc gọn gàng ra sau gáy, tránh nguy cơ vướng hóa chất hoặc bắt lửa!"
        isGlowing={!isTaskDone('task_hair')}
      >
        <group>
          <mesh visible={false}>
            <boxGeometry args={[1.2, 1.1, 0.2]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        </group>
      </InteractableItem>

      {/* Task: Trang bị Kính bảo hộ */}
      <InteractableItem
        id="equip_goggles"
        position={[-3.0, 1.25, 7.1]}
        label="Lấy Kính bảo hộ (Phím E)"
        type="equip"
        equipKey="hasGoggles"
        taskId="task_goggles"
        successMessage="Đã đeo kính bảo hộ chống hóa chất và tia lửa bắn vào mắt!"
        isGlowing={!isTaskDone('task_goggles')}
      >
        <group>
          <mesh visible={false}>
            <boxGeometry args={[0.7, 0.4, 0.3]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        </group>
      </InteractableItem>

      {/* Task: Mặc Áo blouse trắng */}
      <InteractableItem
        id="equip_coat"
        position={[-4.0, 1.35, 7.1]}
        label="Mặc Áo blouse trắng (Phím E)"
        type="equip"
        equipKey="hasLabCoat"
        taskId="task_coat"
        successMessage="Đã mặc áo blouse trắng cài kín cúc bảo vệ cơ thể!"
        isGlowing={!isTaskDone('task_coat')}
      >
        <group>
          <mesh visible={false}>
            <boxGeometry args={[0.9, 1.1, 0.3]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        </group>
      </InteractableItem>

      {/* Task: Đeo Găng tay bảo hộ Nitrile */}
      <InteractableItem
        id="equip_gloves"
        position={[-2.05, 1.25, 7.1]}
        label="Đeo Găng tay bảo hộ Nitrile (Phím E)"
        type="equip"
        equipKey="hasGloves"
        taskId="task_gloves"
        successMessage="Đã đeo găng tay nitrile bảo vệ da tay khỏi hóa chất ăn mòn!"
        isGlowing={!isTaskDone('task_gloves')}
      >
        <group>
          <mesh visible={false}>
            <boxGeometry args={[0.6, 0.4, 0.3]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        </group>
      </InteractableItem>

      {/* Task: Đeo Khẩu trang phòng độc */}
      <InteractableItem
        id="equip_mask"
        position={[-2.5, 0.65, 7.1]}
        label="Đeo Khẩu trang phòng độc (Phím E)"
        type="equip"
        equipKey="hasMask"
        taskId="task_mask"
        successMessage="Đã đeo khẩu trang phòng độc bảo vệ đường hô hấp!"
        isGlowing={!isTaskDone('task_mask')}
      >
        <group>
          <mesh visible={false}>
            <boxGeometry args={[0.5, 0.3, 0.3]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        </group>
      </InteractableItem>

      {/* ================= GIAI ĐOẠN 2: THAO TÁC AN TOÀN & SỰ CỐ ================= */}
      {/* Task: Tìm hiểu bình chữa cháy & P.A.SS tại Tường Tây */}
      <InteractableItem
        id="extinguisher_learn"
        position={[-9.85, 1.1, -1.5]}
        label="Lấy Bình chữa cháy & Học quy trình P.A.S.S (Phím E)"
        type="learn"
        taskId="task_fire_extinguisher"
        equipKey="hasFireExtinguisher"
        dialogCallback={() => {
          setShowFireExtinguisherQuiz(true);
        }}
        isGlowing={currentPhase === 2 && !isTaskDone('task_fire_extinguisher')}
      >
        <group>
          <mesh visible={false}>
            <boxGeometry args={[0.4, 1.0, 0.6]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        </group>
      </InteractableItem>

      {/* Task: Biểu tượng hóa chất GHS trên Tường Bắc */}
      <InteractableItem
        id="symbols_quiz"
        position={[5.5, 2.0, -7.42]}
        label="Bảng nhận diện Biểu tượng GHS (Phím E)"
        type="learn"
        taskId="task_chemical_symbols"
        dialogCallback={() => {
          setShowChemicalSymbolsQuiz(true);
        }}
        isGlowing={currentPhase === 2 && !isTaskDone('task_chemical_symbols')}
      >
        <group>
          <mesh visible={false}>
            <boxGeometry args={[2.8, 1.6, 0.3]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        </group>
      </InteractableItem>

      {/* Task: Quy tắc pha loãng Axit Sunfuric tại Bàn 4 */}
      <InteractableItem
        id="acid_dilute_demo"
        position={[4.2, 0.95, 2.2]}
        label="Tìm hiểu Quy tắc pha loãng Axit (Phím E)"
        type="learn"
        ruleId={3}
        taskId="task_inspect_acid"
        dialogSequence={[
          'QUY TẮC VÀNG PHA LOÃNG AXIT: Luôn luôn rót từ từ Axit vào Nước và khuấy đều!',
          'TUYỆT ĐỐI KHÔNG làm ngược lại (rót Nước vào Axit đậm đặc) vì phản ứng tỏa nhiệt cực mạnh sẽ làm sôi nước tức thì và bắn axit tung tóe gây bỏng nặng!',
        ]}
        isGlowing={currentPhase === 2 && !isTaskDone('task_inspect_acid')}
      >
        <group>
          <mesh visible={false}>
            <boxGeometry args={[0.8, 0.5, 0.8]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        </group>
      </InteractableItem>

      {/* Task: Quấn băng gạc sơ cứu vết thương tại Tường Tây */}
      <InteractableItem
        id="first_aid_bandage"
        position={[-9.85, 1.4, 1.0]}
        label="Hộp sơ cứu - Học quấn băng gạc (Phím E)"
        type="learn"
        taskId="task_bandage"
        dialogCallback={() => {
          setShowBandageQuiz(true);
        }}
        isGlowing={currentPhase === 2 && !isTaskDone('task_bandage')}
      >
        <group>
          <mesh visible={false}>
            <boxGeometry args={[0.3, 0.5, 0.5]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        </group>
      </InteractableItem>

      {/* ================= GIAI ĐOẠN 3: XỬ LÝ TRÀN HÓA CHẤT & RÁC THẢI ================= */}
      {/* Task: Lấy Spill Kit tại Tường Tây */}
      <InteractableItem
        id="spill_kit_box"
        position={[-9.3, 0.3, 3.0]}
        label="Lấy Bộ xử lý hóa chất tràn (Spill Kit) (Phím E)"
        type="action"
        taskId="task_spill_kit"
        equipKey="hasSweeper"
        successMessage="Đã lấy bột trung hòa Sodium Bicarbonate, xẻng nhựa và chổi chuyên dụng từ thùng Spill Kit!"
        isGlowing={currentPhase === 3 && !isTaskDone('task_spill_kit')}
      >
        <group>
          <mesh visible={false}>
            <boxGeometry args={[0.6, 0.8, 0.6]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        </group>
      </InteractableItem>

      {/* Chemical Spill is dynamically simulated via ChemicalSpillSimulation */}

      {/* Task: Thu gom rác thải nguy hại vào trạm thùng rác Tường Đông */}
      <InteractableItem
        id="waste_bins"
        position={[8.8, 0.3, 5.0]}
        label="Phân loại & Thu gom rác thải nguy hại (Phím E)"
        type="action"
        taskId="task_trash_disposal"
        successMessage="Đã phân loại và vứt toàn bộ chất thải hóa học vào đúng thùng chuyên dụng!"
        isGlowing={currentPhase === 3 && isTaskDone('task_spill_wipe') && !isTaskDone('task_trash_disposal')}
      >
        <group>
          <mesh visible={false}>
            <boxGeometry args={[1.0, 0.9, 2.0]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        </group>
      </InteractableItem>
    </group>
  );
};
