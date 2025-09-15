<script lang="ts">
	import HeadStack from '~/components/HeadStack.svelte';
	import {
		tokens,
		modelMeta,
		headContentHeight,
		expandedBlock,
		headGap,
		hoveredMatrixCell,
		timemixHeadIdx
	} from '~/store';
	import classNames from 'classnames';

	import { setContext, getContext } from 'svelte';
	import { Tooltip } from 'flowbite-svelte';
	import { onClickReadMore } from '~/utils/event';

	export let className: string | undefined = undefined;

	setContext('block-id', 'timemix');
	const blockId = getContext('block-id');
	$: isTimeMixExpanded = $expandedBlock.id === blockId;

	const receptanceHeadVectorColor = 'bg-blue-300';
	const keyHeadVectorColor = 'bg-red-300';
	const valHeadVectorColor = 'bg-green-300';

	const wkvVectorColor = 'bg-yellow-300';
	const rwkvVectorColor = 'bg-indigo-300';

	const outputVectorColor = 'bg-purple-300';

	let isHovered = false;

	function handleMouseEnter() {
		isHovered = true;
	}

	function handleMouseLeave() {
		isHovered = false;
	}
</script>

<div
	class={classNames('timemix', className, { expanded: isTimeMixExpanded })}
	data-click="timemix-step"
>
	<div
		class="title"
		on:mouseenter={handleMouseEnter}
		on:mouseleave={handleMouseLeave}
		role="group"
		data-click="timemix-step-title"
	>
		<div class="w-max" on:click={(e) => onClickReadMore(e, 'self-timemix')}>
			TimeMix
		</div>
	</div>
	<div class="content relative">
		<div
			class="bounding timemix-bounding"
			class:active={isHovered && !isTimeMixExpanded}
			style={`padding-bottom:${$modelMeta.timemix_head_num * headGap.y}px`}
		></div>
		<div class="heads">
			<HeadStack>
				<div
					class="head-block flex w-full items-center justify-between px-2"
					style={`height:${$headContentHeight}px;`}
				>
					<!-- RKV -->
					<div class="rkv flex flex-col justify-center gap-[1rem] pl-[6rem]">
						<!-- anchor for SR popover: .step.receptance .content -->
						<div class="step receptance">
							<div class="content">
								<div class="column receptance">
									<div class="head1 title">Receptance</div>
									{#each $tokens as token, index}
										<div
											class="head1 receptance cell x1-12 text-xs"
											class:last={index === $tokens.length - 1}
											class:active={$hoveredMatrixCell.row === index}
										>
											<span class="label float">{token}</span>
											<div class={`vector x1-12  ${receptanceHeadVectorColor}`}></div>
										</div>
										<Tooltip placement="right" class="popover"
											>Receptance, Head {$timemixHeadIdx + 1}, vector({$modelMeta.dimension /
												$modelMeta.timemix_head_num})</Tooltip
										>
									{/each}
								</div>
							</div>
						</div>

						<div class="step key">
							<div class="content">
								<div class="column key">
									<div class="head1 title">Key</div>

									{#each $tokens as token, index}
										<div
											class="head1 key cell x1-12 text-xs"
											class:last={index === $tokens.length - 1}
											class:active={$hoveredMatrixCell.col === index}
										>
											<span class="label float">{token}</span>
											<div class={`vector x1-12 ${keyHeadVectorColor}`}></div>
										</div>
										<Tooltip placement="right" class="popover"
											>Key, Head {$timemixHeadIdx + 1}, vector({$modelMeta.dimension /
												$modelMeta.timemix_head_num})</Tooltip
										>
									{/each}
								</div>
							</div>
						</div>


						<div class="step value">
							<div class="content">
								<div class="column value">
									<div class="head1 title">Value</div>
									{#each $tokens as token, index}
										<div class="head1 value cell x1-12 text-xs" class:last={index === $tokens.length - 1}>
											<span class="label float">{token}</span>
											<div class={`vector x1-12 ${valHeadVectorColor}`}></div>
										</div>
										<Tooltip placement="right" class="popover"
											>Value, Head {$timemixHeadIdx + 1}, vector({$modelMeta.dimension /
												$modelMeta.timemix_head_num})</Tooltip
										>
									{/each}
								</div>
							</div>
						</div>

					</div>
					
					<!-- <div class="resize-watch timemix-matrix flex">
						<TimeMixMatrix />
					</div> -->
					
					<!-- WKV -->
					<div class="wkv flex w-full flex-row justify-center gap-[10rem] pl-[6rem]">
						<!-- anchor for WKV popover: .step.wkv .content -->
						<div class="step wkv">
							<div class="content">
								<div class="column wkv">
							<div class="head1 title">WKV</div>
							{#each $tokens as token, index}
								<div class="head1 wkv cell x1-12 text-xs" class:last={index === $tokens.length - 1}
								class:active={$hoveredMatrixCell.col === index}
								>
									<div class={`vector x1-12 ${wkvVectorColor}`}></div>
								</div>
								<Tooltip placement="right" class="popover"
									>WKV, Head {$timemixHeadIdx + 1}, vector({$modelMeta.dimension /
										$modelMeta.timemix_head_num})</Tooltip
								>
							{/each}
							</div>
							</div>
						</div>
					</div>

					<!-- RWKV -->
					<div class="rwkv flex w-full flex-row justify-center gap-[10rem] pl-[6rem]">
						<!-- anchor for RWKV popover: .step.rwkv .content -->
						<div class="step rwkv">
							<div class="content">
								<div class="column rwkv">
							<div class="head1 title">RWKV</div>
							{#each $tokens as token, index}
								<div class="head1 rwkv cell x1-12 text-xs" class:last={index === $tokens.length - 1}
								class:active={$hoveredMatrixCell.col === index}
								>
									<div class={`vector x1-12 ${rwkvVectorColor}`}></div>
								</div>
								<Tooltip placement="right" class="popover"
									>RWKV, Head {$timemixHeadIdx + 1}, vector({$modelMeta.dimension /
										$modelMeta.timemix_head_num})</Tooltip
								>
							{/each}
							</div>
							</div>
						</div>
					</div>

					<!-- RWKV Out -->
					<div class="head-out mx-[2rem]">
						<!-- anchor for RWKV Out popover: .step.rwkvout .content -->
						<div class="step rwkvout">
							<div class="content">
								<div class="column out">
							<div class="head1 title">Out</div>
							{#each $tokens as token, index}
								<div class="head1 cell x1-12" class:last={index === $tokens.length - 1}>
									<div class={`vector x1-12 ${outputVectorColor}`}></div>
								</div>
								<Tooltip placement="right" class="popover"
									>TimeMix Out, Head 1, vector({$modelMeta.dimension /
										$modelMeta.timemix_head_num})</Tooltip
								>
							{/each}
							</div>
							</div>
						</div>
					</div>
				</div>
			</HeadStack>
		</div>
	</div>
</div>

<style lang="scss">
	.timemix-matrix,
	.head-title {
		z-index: $COLUMN_TITLE_INDEX;
	}
	.timemix {
		> .title > div {
			cursor: help;
		}
		&.expanded {
			.title,
			:global(.head-content) {
				z-index: $EXPANDED_CONTENT_INDEX;
			}
			:global(.multi-head .head-card:first-child) {
				z-index: $EXPANDED_CONTENT_INDEX !important;
			}
		}

		.timemix-bounding {
			top: -0.5rem;
			padding: 0.5rem 0;
			left: -0.3rem;
			width: calc(100% + 1rem);
			height: calc(100%);
		}
		.column {
			.label {
				font-size: 0.7rem;
				color: theme('colors.gray.600');
			}
			.title {
				z-index: $COLUMN_TITLE_INDEX;
				position: absolute;
				top: -1.5rem;
				left: 50%;
				transform: translateX(-50%);
				font-size: 0.8rem;
				transition: none;
			}
			&.receptance .title {
				color: theme('colors.blue.400');
			}
			&.key .title {
				color: theme('colors.red.400');
			}
			&.value .title {
				color: theme('colors.green.400');
			}
			&.out .title {
				color: theme('colors.purple.400');
			}
		}
		.content {
			display: grid;
			grid-template-columns: auto 0;

			.tokens {
				gap: 0.6rem;
			}
		}
		.heads {
			padding: 0 7rem 0 8rem;

			.head1.cell {
				.label {
					height: auto;
					line-height: 1;
				}
				&.active {
					&.receptance {
						.label {
							background-color: theme('colors.blue.100');
							color: theme('colors.blue.700');
						}
					}
					&.key {
						.label {
							background-color: theme('colors.red.100');
							color: theme('colors.red.700');
						}
					}
				}
			}
		}
	}
</style>
