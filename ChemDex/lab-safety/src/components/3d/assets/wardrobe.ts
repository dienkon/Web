/** One wardrobe palette for stored PPE, worn avatar and first-person hands. */
export const WARDROBE={
 coat:'#e5e7dc',lapel:'#edf0e6',seam:'#a4b5b0',pocket:'#d8ded5',button:'#8fa6a4',
 glove:'#70a9b7',gloveFold:'#94bdc2',goggles:'#78a4ad',gasket:'#7b9695',strap:'#526c77',
 mask:'#9abfc5',maskEdge:'#c7dbd9',trousers:'#304754',trouserSeam:'#617580',
 shoe:'#405967',sole:'#c5d2d0',laces:'#a4b8b9',hairTie:'#8e7c88',
} as const;

export const WORN_FIT={
 goggles:{position:[0,-.045,.178] as [number,number,number],scale:[1.2,1,1] as [number,number,number],wrap:.085,strapDepth:.355},
 mask:{position:[0,-.11,.181] as [number,number,number],scale:[1.5,1,1] as [number,number,number],wrap:.075,earDepth:.19,earLift:.075},
 shoulderX:.215,shoulderY:1.31,wristY:.87,hem:.70,
} as const;
