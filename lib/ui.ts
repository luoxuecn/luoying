export const shell = "mx-auto w-[min(1840px,calc(100%-24px))] sm:w-[min(1840px,calc(100%-40px))]";

export const posterFrame = "@container";

export const posterGrid = [
  "grid grid-cols-3 gap-2.5",
  "@min-[490px]:grid-cols-4 @min-[490px]:gap-x-3.5 @min-[490px]:gap-y-4",
  "@min-[742px]:grid-cols-6",
  "@min-[1120px]:grid-cols-9",
].join(" ");

export const homeStrip = [
  "flex snap-x snap-mandatory gap-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  "[--fit:3] [--gap:10px]",
  "@min-[490px]:gap-3.5 @min-[490px]:[--fit:4] @min-[490px]:[--gap:14px]",
  "@min-[616px]:[--fit:5]",
  "@min-[742px]:[--fit:6]",
  "@min-[868px]:[--fit:7]",
  "@min-[994px]:[--fit:8]",
  "[&>.card]:shrink-0 [&>.card]:snap-start",
  "[&>.card]:w-[calc((100cqw-(min(var(--fit),var(--home-cards))-1)*var(--gap))/min(var(--fit),var(--home-cards)))]",
].join(" ");

export const pageHead = "mb-4 flex items-baseline justify-between gap-3";

export const pageTitle = "m-0 text-xl font-[650] tracking-tight";

export const playLayout = "max-[1100px]:flex max-[1100px]:flex-col min-[1101px]:block";

export const playStage =
  "max-[1100px]:contents min-[1101px]:grid min-[1101px]:h-[calc(100svh-64px-1px)] min-[1101px]:grid-cols-[minmax(0,1fr)_380px] min-[1101px]:grid-rows-[auto_minmax(0,1fr)] min-[1101px]:bg-[#0c1017]";

export const playerFrame = [
  "relative z-0 isolate overflow-hidden bg-[#07090d]",
  "aspect-video h-auto w-screen ml-[calc(50%-50vw)]",
  "md:ml-0 md:w-full",
  "max-[1100px]:order-1",
  "min-[1101px]:col-start-1 min-[1101px]:row-span-2 min-[1101px]:row-start-1 min-[1101px]:m-0 min-[1101px]:aspect-auto min-[1101px]:h-auto min-[1101px]:w-auto min-[1101px]:min-h-0 min-[1101px]:min-w-0",
].join(" ");

export const playTitle = [
  "order-2 mt-4 block text-xl font-[650] leading-snug",
  "min-[1101px]:col-start-2 min-[1101px]:row-start-1 min-[1101px]:m-0 min-[1101px]:border-l min-[1101px]:border-line min-[1101px]:bg-[#0c1017] min-[1101px]:px-4 min-[1101px]:pt-4 min-[1101px]:pb-2",
].join(" ");

export const playSide =
  "order-4 min-[1101px]:col-start-2 min-[1101px]:row-start-2 min-[1101px]:min-h-0 min-[1101px]:min-w-0 min-[1101px]:overflow-auto min-[1101px]:border-l min-[1101px]:border-line min-[1101px]:bg-[#0c1017] min-[1101px]:px-4 min-[1101px]:pt-0 min-[1101px]:pb-5 local-scroll";

export const playDetail = "order-3 min-[1101px]:mx-auto min-[1101px]:w-[min(1840px,calc(100%-40px))]";

export const playLines = "mt-[22px] flex flex-col items-stretch md:max-[1100px]:mt-[18px] min-[1101px]:mt-0";

export const chipRow = "flex items-start gap-2.5 max-xl:items-center";

export const chipLabel = "w-11 shrink-0 pt-1 text-[13px] text-faint max-xl:w-9 max-xl:pt-0";

export const chipScroller =
  "flex flex-wrap gap-1.5 max-xl:min-w-0 max-xl:flex-1 max-xl:flex-nowrap max-xl:overflow-x-auto max-xl:[scrollbar-width:none] max-xl:[&::-webkit-scrollbar]:hidden";
