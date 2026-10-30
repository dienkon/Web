import React from 'react';
import { PlayerModel } from '../PlayerModel';
import type { CharacterProfile, PlayerState } from '../../../types';
const PREPARED:PlayerState={equipment:{hasGoggles:true,hasLabCoat:true,hasGloves:true,hasMask:true,hairTied:true,hasClosedShoes:true},inventory:{},flags:{}};
export function CharacterStudy({teacher=false,prepared=true,hair='ponytail',equipment}:{teacher?:boolean;prepared?:boolean;hair?:CharacterProfile['hairStyle'];equipment?:Partial<PlayerState['equipment']>}){
 const character:CharacterProfile={name:teacher?'Giáo viên':'Học sinh',gender:teacher?'male':'female',skinTone:'#e6b89b',hairStyle:teacher?'short':hair,hairColor:teacher?'#5e7078':'#5b4f43',shirtColor:teacher?'#7199aa':'#87adb0'};
 const player:PlayerState=prepared?{...PREPARED,equipment:{...PREPARED.equipment,hasMask:!teacher,hasGoggles:!teacher,hasGloves:!teacher}}:{...PREPARED,equipment:{...PREPARED.equipment,hasGoggles:false,hasLabCoat:false,hasGloves:false,hasMask:false,hairTied:false}};
 return <PlayerModel position={[0,0,0]} rotationY={0} isMoving={false} player={{...player,equipment:{...player.equipment,...equipment}}} character={character}/>;
}
