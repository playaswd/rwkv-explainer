<script lang="ts">
	import { modelMeta, tokens, rootRem } from '~/store';
	import * as d3 from 'd3';
	import { gsap } from '~/utils/gsap';
	import Matrix from '~/components/common/Matrix.svelte';
	import { onDestroy, onMount } from 'svelte';
	import resolveConfig from 'tailwindcss/resolveConfig';
	import tailwindConfig from '../../../tailwind.config';
	import HelpPopover from '../common/HelpPopover.svelte';
	import WeightPopoverCard from '../common/WeightPopoverCard.svelte';

	export let isOpen = true;

	const { theme } = resolveConfig(tailwindConfig);

	const tokenGap = 6;

	// generate data
	const visibleDimension = 18;
	$: tokenLen = $tokens.length;
	$: inputData = Array(tokenLen)
		.fill(0)
		.map((col) =>
			Array(visibleDimension)
				.fill(0)
				.map((d) => Math.random())
		);

	const weightData = Array(visibleDimension * 5)
		.fill(0)
		.map((col) =>
			Array(visibleDimension)
				.fill(0)
				.map((d) => Math.random())
		);

	$: logitData = Array(tokenLen)
		.fill(0)
		.map((col) =>
			Array(visibleDimension * 5)
				.fill(0)
				.map((d) => Math.random())
		);

	// color scale
	const embeddingColorScale = (d, i) => {
		return d3.interpolate(theme.colors['blue'][100], theme.colors['blue'][400])(d);
	};
	const weightColorScale = (d, i) => {
		return d3.interpolate(theme.colors['gray'][100], theme.colors['gray'][400])(d);
	};
	const logitColorScale = (d, i) => {
		return d3.interpolate(theme.colors['blue'][100], theme.colors['gray'][400])(d);
	};

	// animation
	let isAnimationActive = false;
	let progress = 0;
	let timeline;

	onMount(() => {
		timeline = gsap.timeline();

		timeline.eventCallback('onUpdate', () => {
			progress = timeline.progress();
			if (progress === 1) isAnimationActive = false;
		});

		setTimeout(() => {
			isAnimationActive = true;
			draw();
		}, 300);
	});

	onDestroy(() => {
		if (timeline) {
			timeline.kill();
			timeline = null;
		}
	});

	const draw = () => {
		const embeddingRows = d3.selectAll('.weight-popover-content .hidden-state g.g-row').nodes();
		const weightCols = d3.selectAll('.weight-popover-content .lm-head-weight g.g-col').nodes();

		const outRows = d3.selectAll('.weight-popover-content .logits g.g-row').nodes();

		// const mulSymbol = d3.select('.weight-popover-content .symbol.mul').node();
		const equalSymbol = d3.select('.weight-popover-content .symbol.equal').node();

		timeline.clear();
		const highlight = '#94a3b8';

		// first row detail animation
		const firstOutputRowRects = d3.select(outRows[0]).selectAll('rect').nodes();
		const firstEmbeddingRowRects = d3.select(embeddingRows[0]).selectAll('rect').nodes();

		firstOutputRowRects.forEach((outputRect, outCellIdx) => {
			const isFirstOutCell = outCellIdx === 0;
			const firstWeightColRects = d3.select(weightCols[outCellIdx]).selectAll('rect').nodes();
			timeline.set(firstEmbeddingRowRects, { opacity: 0.1 });

			firstEmbeddingRowRects.forEach((embeddingRect, i) => {
				//embedding
				timeline
					.fromTo(
						embeddingRect,
						{ opacity: 0.1, strokeWidth: 0 },
						{
							opacity: 1,
							duration: isFirstOutCell ? 0.1 : 0.002,
							strokeWidth: 10,
							stroke: highlight
						}
					)
					.to(
						embeddingRect,
						{
							strokeWidth: 0,
							duration: isFirstOutCell ? 0.1 : 0.002
						},
						'<50%'
					);

				//weights
				timeline
					.fromTo(
						firstWeightColRects[i],
						{ opacity: 0.1, strokeWidth: 0 },
						{
							opacity: 1,
							duration: isFirstOutCell ? 0.1 : 0.002,
							strokeWidth: 10,
							stroke: highlight
						},
						'<-50%'
					)
					.to(
						firstWeightColRects[i],
						{
							strokeWidth: 0,
							duration: isFirstOutCell ? 0.1 : 0.002
						},
						'<50%'
					);
			});

			//symbol
			if (isFirstOutCell) {
				timeline.from(
					equalSymbol,
					{
						duration: 0.05,
						opacity: 1
					},
					'<50%'
				);
			}

			//out
			timeline
				.fromTo(
					outputRect,
					{ opacity: 0, strokeWidth: 0 },
					{
						opacity: 1,
						duration: isFirstOutCell ? 0.4 : 0.002,
						strokeWidth: 10,
						stroke: highlight
					},
					'<-50%'
				)
				.to(
					outputRect,

					{
						strokeWidth: 0,
						duration: isFirstOutCell ? 0.4 : 0.002
					},
					'<50%'
				);
		});

		// rest row animation
		let previousRowIdx = 0;

		// out vectors
		outRows.forEach(function (row, rowIdx) {
			if (rowIdx === 0) return;

			const outputCells = d3.select(row).selectAll('rect').nodes();
			const embeddingRowRects = d3.select(embeddingRows[rowIdx]).selectAll('rect').nodes();

			// Check if rowIdx has changed
			if (previousRowIdx !== null && previousRowIdx !== rowIdx) {
				timeline.fromTo(
					embeddingRowRects,
					{ opacity: 0.1 },
					{
						opacity: 1,
						duration: 0.01
					},
					'<'
				);

				const weightColRects = d3
					.selectAll('.weight-popover-content .lm-head-weight g.g-col rect')
					.nodes();
				timeline.set(weightColRects, { opacity: 0.1 });
			}

			outputCells.forEach((d, colIdx) => {
				const weightColRects = d3.select(weightCols[colIdx]).selectAll('rect').nodes();

				timeline.fromTo(
					weightColRects,
					{ opacity: 0.1 },
					{
						opacity: 1,
						duration: 0.01
					},
					`<50%`
				);

				timeline.from(
					d,
					{
						opacity: 0,
						duration: 0.01
					},
					`<50%`
				);
			});
			previousRowIdx = rowIdx;
		});
	};

	// event
	let highlightCol: number | undefined = undefined;
	let highlightRow: number | undefined = undefined;

	const onMouseOverCell = (e, d) => {
		if (isAnimationActive) return;
		highlightRow = d.rowIndex;
		highlightCol = d.colIndex;
	};
	const onMouseOutSvg = () => {
		highlightCol = undefined;
		highlightRow = undefined;
	};
</script>

<WeightPopoverCard id="logits" title={'Logits'} bind:isAnimationActive {timeline} bind:isOpen>
	<div class="weight-popover-content flex items-center justify-start">
		<div class="matrix flex flex-col items-center">
			<div class="title flex items-center gap-1">
				<span>Output<br />Embedding</span>
				<HelpPopover id="hidden-state" placement="top"
					>{`After passing through all blocks, \nthe final token's embedding vector \ncontains all the contextual information \nfrom the preceding tokens.`}</HelpPopover
				>
			</div>
			<Matrix
				className="hidden-state"
				data={inputData}
				showSize={false}
				cellHeight={rootRem * 0.8}
				cellWidth={2}
				rowGap={tokenGap}
				colorScale={embeddingColorScale}
				{highlightRow}
			/>
			<div class="size">({tokenLen}, {$modelMeta.dimension})</div>
		</div>
		<div class="operator"><div class="symbol mul pl-3">&times;</div></div>
		<div class="matrix flex flex-col items-center">
			<div class="title flex items-center gap-1">
				Output Projection Weights
				<HelpPopover id="lm-head-weight" placement="top"
					>{`Transforms the final embedding into a vocabulary distribution.\nParameters that are learned in training, fixed in prediction.`}</HelpPopover
				>
			</div>
			<div class="flex gap-0">
				<Matrix
					className="lm-head-weight"
					data={weightData}
					showSize={false}
					groupBy={'col'}
					cellHeight={2}
					cellWidth={2}
					rowGap={0}
					colorScale={weightColorScale}
					{highlightCol}
				/>
			</div>

			<div class="size">({$modelMeta.dimension}, {$modelMeta.vocabSize})</div>
		</div>
		<div class="operator"><div class="symbol equal">=</div></div>
		<div class="matrix flex flex-col items-center">
			<div class="title flex items-center gap-1">
				Logits
				<HelpPopover id="logits" placement="top"
					>{`Raw scores representing the model’s preference \nfor each vocabulary token before applying softmax.`}</HelpPopover
				>
			</div>
			<div class="flex">
				<Matrix
					className="logits"
					data={logitData}
					showSize={false}
					cellHeight={rootRem * 0.8}
					cellWidth={2}
					rowGap={tokenGap}
					colorScale={logitColorScale}
					{onMouseOverCell}
					{onMouseOutSvg}
					{highlightCol}
					{highlightRow}
				/>
			</div>
			<div class="size">({tokenLen}, {$modelMeta.vocabSize})</div>
		</div>
	</div>
</WeightPopoverCard>

<style lang="scss">
	.weight-popover-content {
		padding: 3rem 2rem 3rem 3.5rem;
		gap: 0.5rem;
	}
	.matrix .title {
		text-align: center;
		line-height: 1.2;
	}
</style>
