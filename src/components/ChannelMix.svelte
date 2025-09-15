<script lang="ts">
	// Import global state and utility functions
	import { tokens, modelMeta, blockIdx } from '~/store';
	import classNames from 'classnames';
	import { setContext } from 'svelte';
	import OperationGroup from './OperationGroup.svelte';
	import VectorCanvas from './common/VectorCanvas.svelte';
	import { Tooltip } from 'flowbite-svelte';
	import { onClickReadMore } from '~/utils/event';

	// Allow external custom className
	export let className: string | undefined = undefined;

	// Set block-id context for child component identification
	setContext('block-id', 'cmix');

	// Define color styles for each layer
	const firstLayerlColor = 'bg-purple-200';
	const secondLayerColor = 'bg-indigo-200';
	const outputColor = 'bg-blue-200';

	// Control mouse hover state
	let isHovered = false;

	function handleMouseEnter() {
		isHovered = true;
	}

	function handleMouseLeave() {
		isHovered = false;
	}

	// Control the index for vector hover highlight
	let vectorHoverIdx: number | null = null;
</script>

<!-- Main structure: ChannelMix visualization module -->
<div class={classNames('cmix', 'cmixUp', 'cmixDown', className)} data-click="cmix-step">
	<!-- Title bar, supports mouse hover and click to jump to article -->
	<div
		class="title"
		on:mouseenter={handleMouseEnter}
		on:mouseleave={handleMouseLeave}
		role="group"
		data-click="cmix-step-title"
	>
		<div class="w-max" on:click={(e) => onClickReadMore(e, 'article-activation')}>ChannelMix</div>
	</div>
	<div class="content relative">
		<!-- Boundary highlight area, changes with hover -->
		<div class="bounding cmix-bounding" class:active={isHovered}></div>
		<!-- First layer: initial vector display -->
		<div class="layer cmixUp first-layer flex">
			<div class="column initial">
				{#each $tokens as token, index}
					<!-- Each token's vector display, supports hover highlight -->
					<div
						class="cell"
						class:last={index === $tokens.length - 1}
						on:mouseenter={() => {
							vectorHoverIdx = index;
						}}
						on:mouseleave={() => {
							vectorHoverIdx = null;
						}}
						role="group"
					>
						<span class="label float">{token}</span>
						<div class={`vector flex flex-col  ${firstLayerlColor}`}>
							<!-- Vector visualization component -->
							<VectorCanvas colorScale="purple" active={vectorHoverIdx === index} />
							<div class="sub-vector x1-12 head1"></div>
							<div class="sub-vector head-rest grow"></div>
						</div>
					</div>
					<!-- Vector dimension tooltip -->
					<Tooltip placement="right" class="popover">vector({$modelMeta.dimension})</Tooltip>
				{/each}
			</div>
			<!-- Residual connection and normalization operation group -->
			<OperationGroup type="residual-end" id={'embedding-residual'} />
			<OperationGroup type="residual-start" id={'cmix-residual'} />
			<OperationGroup type="ln" id={'cmix-first-ln'} />
		</div>
		<!-- Second layer: upsampled vector display -->
		<div class="layer cmixUp cmixDown second-layer flex justify-between">
			<div class="column cmix-mid-column">
				{#each $tokens as token, index}
					<div
						class={classNames('cell x4', { small: index !== 0 && index !== $tokens.length - 1 })}
						class:last={index === $tokens.length - 1}
					>
						<div class={classNames(`vector x4 ${secondLayerColor} opacity-80`)}>
							<VectorCanvas colorScale="indigo" />
						</div>
					</div>
					<!-- Upsampled vector dimension tooltip -->
					<Tooltip placement="right" class="popover">vector({$modelMeta.dimension * 4})</Tooltip>
				{/each}
			</div>
		</div>
		<!-- Output layer: activation, residual, normalization and final output -->
		<div class="layer cmixDown out-layer relative flex justify-between">
			<div class="activation">
				<!-- Activation operation group -->
				<OperationGroup type="activation" id={'cmix-activation'} className="x4" />
			</div>
			<div class="ouputs flex">
				<!-- Output label column, only the last token shows label -->
				<div class="column out-label">
					{#each $tokens as token, index}
						<div class="cell" class:last={index === $tokens.length - 1}>
							<span class="label float">{token}</span>
						</div>
					{/each}
				</div>
				<!-- Residual connection -->
				<OperationGroup type="residual-end" id={'cmix-residual'} />
				<!-- Show normalization operation in the last layer -->
				{#if $blockIdx === $modelMeta.layer_num - 1}
					<OperationGroup type="ln" id={'cmix-second-ln'} />
				{/if}
				<!-- Output vector column, special style for last layer -->
				<div
					class="column out cmix-out-column"
					class:last-block={$blockIdx === $modelMeta.layer_num - 1}
				>
					{#each $tokens as token, index}
						<div class="cell" class:last={index === $tokens.length - 1}>
							<div class={`vector ${outputColor}`}>
								<VectorCanvas colorScale="blue" />
							</div>
						</div>
						<!-- Output vector dimension tooltip -->
						<Tooltip placement="right" class="popover">vector({$modelMeta.dimension})</Tooltip>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.cmix {
		.title > div {
			cursor: help;
		}
		.cmix-bounding {
			top: -0.5rem;
			padding: 0.5rem 0;
			left: -0.2rem;
			width: calc(100% + 0.2rem);
			height: 100%;
		}
		.content {
			display: grid;
			grid-template-columns: repeat(4, minmax(var(--min-column-width), 1fr));

			.first-layer {
				grid-column: span 2;
			}

			.activation {
				position: relative;
				left: calc(-100% + 0.8rem);
			}
		}

		.column.out-label {
			.label {
				opacity: 0;
			}
			.last .label {
				opacity: 1;
			}
		}
		.last-block {
			pointer-events: none;
			.vector {
				width: 0;
			}
		}
	}
</style>
