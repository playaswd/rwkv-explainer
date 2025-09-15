<script lang="ts">
	import * as d3 from 'd3';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { ArrowUpRightDownLeftOutline } from 'flowbite-svelte-icons';

	import { weightPopover, tooltip } from '~/store';
	
	import RKVWeightPopover from './Popovers/RKVWeightPopover.svelte';
	import WKVWeightPopover from './Popovers/WKVWeightPopover.svelte';
	import SRWeightPopover from './Popovers/SRWeightPopover.svelte';
	import RWKVWeightPopover from './Popovers/RWKVWeightPopover.svelte';
	import RWKVOutWeightPopover from './Popovers/RWKVOutWeightPopover.svelte';
	import ChannelMixWeightPopover from './Popovers/ChannelMixWeightPopover.svelte';
	import ChannelMixDownWeightPopover from './Popovers/ChannelMixDownWeightPopover.svelte';

	import LogitWeightPopover from './Popovers/LogitWeightPopover.svelte';
	

	let resizeObserver: ResizeObserver;
	
	let rkvPos = { left: 0, top: 0 };
	let srPos = { left: 0, top: 0 };
	let wkvPos = { left: 0, top: 0 };
	let rwkvPos = { left: 0, top: 0 };
	let rwkvOutPos = { left: 0, top: 0 };
	
	let cmixPos = { left: 0, top: 0 };
	let cmixDownPos = { left: 0, top: 0 };
	
	let softmaxPos = { left: 0, top: 0 };

	let popoverEl: HTMLElement = null;

	function handleOutsideClick(e) {
		if (!!$weightPopover && popoverEl && !popoverEl.contains(e.target)) {
			weightPopover.set(null);
		}
	}
	// add global event
	onMount(() => {
		document.querySelector('.main-section').addEventListener('click', handleOutsideClick);

		return () => {
			document.querySelector('.main-section').removeEventListener('click', handleOutsideClick);
		};
	});

	//set popover pos
	onMount(() => {
		const setPosition = () => {
			const scrollLeft = window.scrollX;
			const topbarHeight = document.querySelector('.top-bar')?.offsetHeight;

			// const embedding = document.querySelector('.step.embedding .content');

			const rkv = document.querySelector('.step.rkv .content');

			const sr = document.querySelector('.step.receptance .content');
			const wkv = document.querySelector('.step.wkv .content');
			const rwkv = document.querySelector('.step.rwkv .content');
			const rwkvout = document.querySelector('.step.rwkvout .content');
			
			const cmix = document.querySelector('.step.cmix .content');
			const cmixDown = document.querySelector('.step.cmix .second-layer');
			
			const softmax = document.querySelector('.step.rwkv-blocks .content');


			// const embeddingRect = embedding.getBoundingClientRect();
			
			const rkvRect = rkv.getBoundingClientRect();
			const srRect = sr.getBoundingClientRect();
			const wkvRect = wkv.getBoundingClientRect();
			const rwkvRect = rwkv.getBoundingClientRect();
			const rwkvoutRect = rwkvout.getBoundingClientRect();

			const cmixRect = cmix.getBoundingClientRect();
			const cmixDownRect = cmixDown.getBoundingClientRect();

			const softmaxRect = softmax.getBoundingClientRect();

			rkvPos = {
				left: rkvRect.right + scrollLeft,
				top: rkvRect.top - topbarHeight
			};

			wkvPos = {
				left: wkvRect.right + scrollLeft,
				top: wkvRect.top - topbarHeight
			};
			rwkvPos = {
				left: rwkvRect.right + scrollLeft,
				top: rwkvRect.top - topbarHeight
			};
			rwkvOutPos = {
				left: rwkvoutRect.right + scrollLeft,
				top: rwkvoutRect.top - topbarHeight
			};

			cmixPos = {
				left: cmixRect.left + scrollLeft,
				top: cmixRect.top - topbarHeight
			};
			cmixDownPos = {
				left: cmixDownRect.left + scrollLeft,
				top: cmixDownRect.top - topbarHeight
			};

			srPos = {
				left: srRect.left + scrollLeft,
				top: srRect.top - topbarHeight
			};
			
			softmaxPos = {
				left: softmaxRect.left + scrollLeft,
				top: softmaxRect.top - topbarHeight
			};
		};

		setPosition();

		resizeObserver = new ResizeObserver((entries) => {
			setPosition();
		});
		const elements = document?.querySelectorAll('.resize-watch');
		elements.forEach((el) => resizeObserver.observe(el));

		return () => {
			document.querySelector('.main-section').removeEventListener('click', handleOutsideClick);
		};
	});

	//tooltip
	$: isVisible = !!$tooltip && !$weightPopover;

	let x = 0;
	let y = 0;

	function handleMouseMove(e) {
		x = e.clientX + 10;
		y = e.clientY + 10;
	}

	onMount(() => {
		window.addEventListener('mousemove', handleMouseMove);

		const unsubscribe = weightPopover.subscribe((value) => {
			if (!value) {
				d3.selectAll(`svg g.path-group`).style('opacity', 1);
				d3.selectAll('div.step > div').style('opacity', 1);
				d3.selectAll('div.step.cmix .layer').style('opacity', 1);
				d3.selectAll('.steps').style('pointer-events', 'auto');
				return;
			}

			d3.selectAll(`svg g.path-group`).style('opacity', 0.3);
			d3.selectAll(`svg g.path-group.${value}`).style('opacity', 1);
			d3.selectAll('div.step > div').style('opacity', 0.3);
			d3.selectAll(`div.step.${value} > div`).style('opacity', 1);
			d3.selectAll('.steps').style('pointer-events', 'none');

			if (value === 'cmixUp' || value === 'cmixDown') {
				d3.selectAll(`div.step.${value} .layer`).style('opacity', 0.3);
				d3.selectAll(`div.step.${value} .layer.${value}`).style('opacity', 1);
			}
		});
		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
			unsubscribe();
		};
	});
</script>

{#if isVisible}
	<div
		class="tooltip-box rounded shadow-lg"
		style="left: {x}px; top: {y}px;"
		in:fade={{ duration: 100 }}
	>
		{$tooltip}
		<ArrowUpRightDownLeftOutline size="sm" />
	</div>
{/if}

{#if $weightPopover === 'tmix-rkv'}
	<div
		bind:this={popoverEl}
		class="rkv-weight-popover weight-popover"
		style={`left:${rkvPos.left}px;top:${rkvPos.top}px;`}
		in:fade={{ duration: 300 }}
		role="group"
	>
		<RKVWeightPopover></RKVWeightPopover>
	</div>
{/if}
{#if $weightPopover === 'tmix-wkv'}
	<div
		bind:this={popoverEl}
		class="wkv-weight-popover weight-popover"
		style={`left:${wkvPos.left}px;top:${wkvPos.top}px;`}
		in:fade={{ duration: 300 }}
		role="group"
	>
		<WKVWeightPopover></WKVWeightPopover>
	</div>
{/if}
{#if $weightPopover === 'tmix-sr'}
	<div
		bind:this={popoverEl}
		class="sr-weight-popover weight-popover"
		style={`left:${srPos.left}px;top:${srPos.top}px;`}
		in:fade={{ duration: 300 }}
		role="group"
	>
		<SRWeightPopover></SRWeightPopover>
	</div>
{/if}
{#if $weightPopover === 'tmix-rwkv'}
	<div
		bind:this={popoverEl}
		class="rwkv-weight-popover weight-popover"
		style={`left:${rwkvPos.left}px;top:${rwkvPos.top}px;`}
		in:fade={{ duration: 300 }}
		role="group"
	>
		<RWKVWeightPopover></RWKVWeightPopover>
	</div>
{/if}
{#if $weightPopover === 'tmix-rwkvout'}
	<div
		bind:this={popoverEl}
		class="rwkvout-weight-popover weight-popover"
		style={`left:${rwkvOutPos.left}px;top:${rwkvOutPos.top}px;`}
		in:fade={{ duration: 300 }}
		role="group"
	>
		<RWKVOutWeightPopover></RWKVOutWeightPopover>

	</div>
{/if}
{#if $weightPopover === 'cmix-up'}
	<div
		bind:this={popoverEl}
		class="cmix-up-popover weight-popover"
		style={`left:${cmixPos.left}px;top:${cmixPos.top}px;`}
		in:fade={{ duration: 300 }}
		role="group"
	>
		<ChannelMixWeightPopover></ChannelMixWeightPopover>
	</div>
{/if}
{#if $weightPopover === 'cmix-down'}
	<div
		bind:this={popoverEl}
		class="cmix-down-popover weight-popover"
		style={`left:${cmixDownPos.left}px;top:${cmixDownPos.top}px;`}
		in:fade={{ duration: 300 }}
		role="group"
	>
		<ChannelMixDownWeightPopover></ChannelMixDownWeightPopover>
	</div>
{/if}
{#if $weightPopover === 'softmax'}
	<div
		bind:this={popoverEl}
		class="softmax-weight-popover weight-popover"
		style={`left:${softmaxPos.left}px;top:${softmaxPos.top}px;`}
		in:fade={{ duration: 300 }}
		role="group"
	>
		<LogitWeightPopover></LogitWeightPopover>
	</div>
{/if}

<style lang="scss">
	.weight-popover {
		z-index: $POPOVER_INDEX;
		position: absolute;
		width: max-content !important;
	}
	.rkv-weight-popover {
		transform: translateX(1rem);
	}
	.wkv-weight-popover {
		transform: translateX(1rem, -50%);
	}
	.sr-weight-popover {
		transform: translateX(1rem, -50%);
	}
	.rwkv-weight-popover {
		transform: translate(1rem, -50%);
	}
	.rwkvout-weight-popover {
		transform: translate(1rem, -50%);
	}
	.cmix-weight-popover {
		transform: translateX(calc(-100% - 0.5rem));
	}
	/* apply same behaviour for the up/down cmix popovers (class names used in markup)
	   so the popover's right edge aligns to the target element's left edge */
	// .cmix-up-popover,
	.cmix-down-popover {
		transform: translateX(calc(-100% - 0.5rem));
	}
	.softmax-weight-popover {
		transform: translateX(calc(-100% + 1rem));
	}
	.tooltip-box {
		z-index: $POPOVER_INDEX;

		background-color: white;
		position: fixed;
		border: 1px solid theme('colors.gray.200');
		color: theme('colors.gray.600');
		padding: 0.2rem 0.4rem;
		border-radius: 0.4rem;
		pointer-events: none;
		white-space: nowrap;
		font-size: 0.8rem;
		font-weight: 300;

		display: flex;
		align-items: center;
		gap: 2px;
	}
</style>
