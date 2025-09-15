<script lang="ts">
	// Import Svelte stores and constants used for rendering and interaction
	import {
		tokens,              // Token list for the current input
		modelMeta,           // Model metadata (layer count, etc.)
		rootRem,             // Root rem size for layout calculations
		weightPopover,       // Store for popover state (shows details on click)
		tooltip,             // Store for tooltip text (shows on hover)
		timemixHeadIdx,      // Store for current TimeMix head index
		blockIdx,            // Store for current block index
		isOnBlockTransition  // Store for block transition state
	} from '~/store';
	import * as d3 from 'd3';
	import { onMount, tick } from 'svelte';
	import resolveConfig from 'tailwindcss/resolveConfig';
	import tailwindConfig from '../../tailwind.config';
	import { gradientMap } from '~/constants/gradient';
	import {
		TIMEMIX_HEAD_1,
		TIMEMIX_HEAD_BACK,
		TIMEMIX_OUT,
		EMBEDDING,
		LOGIT,
		CMIX,
		RWKV_BLOCKS
	} from '~/constants/opacity';

	const { theme } = resolveConfig(tailwindConfig);

	let svgBackEl: HTMLOrSVGElement;
	let svgEl: HTMLOrSVGElement;

	let resizeObserver: ResizeObserver;
	let screenWidth: number;

	// Dynamically adjust curve factor based on screen width for responsive SVG path curvature
	$: curveFactor = Math.floor(screenWidth / 1000) || 1;
	// Set default curve offset for SVG paths, increasing with curveFactor for larger screens
	$: defaultCurveOffset = 40 * (curveFactor - 1) + 80;

	// Type definition for mapping path groups to their SVG path configurations.
	// Each key in PathMap represents a group (e.g., 'timemix', 'rkv', etc.).
	// Each value is an array of path configuration objects, specifying:
	//   - from: CSS selector for source element(s)
	//   - to: CSS selector for target element(s)
	//   - gradientId: (optional) gradient id for SVG fill
	//   - fill: (optional) fallback fill color
	//   - opacity: (optional) path opacity
	//   - curve: (optional) curve offset for path shape
	//   - type: (optional) 'stroke' or 'shape' for SVG rendering
	//   - id: (optional) unique id for the path
	//   - pathGenerator: (optional) custom function to generate SVG path string
	type PathMap = Record<
		string,
		{
			from: string;
			to: string;
			gradientId?: string;
			fill?: string;
			opacity?: number;
			curve?: number;
			type?: 'stroke' | 'shape';
			id?: string;
			pathGenerator?: (source: DOMRect, target: DOMRect, curve: number) => string;
		}[]
	>;

	// Define the background paths for the Sankey diagram.
	// These are used for visualizing the "back" connections between major blocks,
	// typically rendered in the background layer for context or subtle highlighting.
	// Each path object specifies:
	//   - from: CSS selector for the source element(s)
	//   - to: CSS selector for the target element(s)
	//   - gradientId: gradient id for SVG fill (for color transitions)
	//   - opacity: path opacity (usually lower for background)
	const backPaths = [
		{
			// Receptance vector from RKV block to head block
			from: '.rkv .rkv-column .receptance',
			to: '.head-block .receptance .vector',
			// fill: theme.colors.blue[defaultGradientBrightness],
			gradientId: 'blue-blue2',
			opacity: TIMEMIX_HEAD_BACK
		},
		{
			// Key vector from RKV block to head block
			from: '.rkv .rkv-column .key',
			to: '.head-block .key .vector',
			// fill: theme.colors.red[defaultGradientBrightness],
			gradientId: 'red-red2',
			opacity: TIMEMIX_HEAD_BACK
		},
		{
			// Value vector from RKV block to head block
			from: '.rkv .rkv-column .value',
			to: '.head-block .value .vector',
			gradientId: 'green-green2',
			// fill: theme.colors.green[defaultGradientBrightness],
			opacity: TIMEMIX_HEAD_BACK
		},
		{
			// Output vector from TimeMix head to CMIX initial vector
			from: '.timemix .head-out .vector',
			to: '.cmix .initial .vector',
			gradientId: 'purple-purple',
			opacity: TIMEMIX_HEAD_BACK
		}
	];
	// Define the mapping for background paths in the Sankey diagram.
	// These paths are rendered in the background SVG layer and provide subtle visual context
	// for connections between major blocks (e.g., RKV to head block, TimeMix to CMIX, etc.).
	// The map is split into two groups:
	//   - timemix: for the current block (main)
	//   - nextTimeMix: for the next block (during block transitions)
	// Each entry clones the CSS selectors to ensure correct scoping for each block step.
	const backPathMap: PathMap = {
		// Background paths for the current block (main)
		timemix: backPaths.map((d) => ({
			...d,
			// Prefix selectors to scope to the main block step
			from: `.block-steps.main ${d.from}`,
			to: `.block-steps.main ${d.to}`
		})),
		// Background paths for the next block (during transition)
		nextTimeMix: backPaths.map((d) => ({
			...d,
			// Prefix selectors to scope to the next block step
			from: `.block-steps.next ${d.from}`,
			to: `.block-steps.next ${d.to}`
		}))
	};

	// Define the paths for the RKV block in the Sankey diagram.
	// These paths visually connect the embedding vectors to the RKV vectors,
	// and provide interactive tooltips and popovers for user exploration.
	// Each path object specifies:
	//   - from: CSS selector for the source element(s) (embedding vectors)
	//   - to: CSS selector for the target element(s) (RKV vectors)
	//   - gradientId: gradient id for SVG fill (changes based on block index)
	//   - opacity: path opacity (uses EMBEDDING constant)
	//   - pathGenerator: custom function to generate SVG path string with curve and offset
	//   - onMouseOver: handler to highlight path and show tooltip
	//   - onMouseOut: handler to reset path opacity and hide tooltip
	//   - onMouseClick: handler to toggle popover for RKV details
	$: rkvPaths = [
		{
			from: '.rkv .vector-column .column.vectors .vector', // Source: embedding vectors
			to: '.rkv .rkv-column .vector', // Target: RKV vectors
			gradientId: $blockIdx === 0 ? 'gray-blue' : 'transparent-blue', // Use different gradient for first block
			opacity: EMBEDDING,
			pathGenerator: (source, target, curve: number) => {
				const scrollTop = window.scrollY;
				const scrollLeft = window.scrollX;

				const rightOffset = 30; // Offset to visually separate the path from the source
				const { curveOffset } = pathAdjustor(source, target, curve);
				return `
					M ${source.right + scrollLeft},${source.top + scrollTop}
					L ${source.right + rightOffset + scrollLeft},${source.top + scrollTop}
					C ${source.right + rightOffset + scrollLeft + curveOffset},${source.top + scrollTop} ${target.left + scrollLeft - curveOffset},${target.top + scrollTop} ${target.left + scrollLeft},${target.top + scrollTop}
					L ${target.left + scrollLeft},${target.bottom + scrollTop}
					C ${target.left + scrollLeft - curveOffset},${target.bottom + scrollTop} ${source.right + rightOffset + scrollLeft + curveOffset},${source.bottom + scrollTop} ${source.right + rightOffset + scrollLeft},${source.bottom + scrollTop}
					L ${source.right + scrollLeft},${source.bottom + scrollTop}
					Z
				`;
			},
			onMouseOver: () => {
				// Highlight all RKV paths and show tooltip
				const paths = d3.select(`g.rkv`).selectAll('path');
				paths.transition().duration(100).style('opacity', 1);
				tooltip.set('click to see RKV calculation');
			},
			onMouseOut: () => {
				// Reset opacity and hide tooltip
				const paths = d3.select(`g.rkv`).selectAll('path');
				paths.transition().duration(100).style('opacity', EMBEDDING);
				tooltip.set(null);
			},
			onMouseClick: (e, d) => {
				// Toggle RKV popover
				e.stopPropagation();
				if ($weightPopover === 'tmix-rkv') weightPopover.set(null);
				else weightPopover.set('tmix-rkv');
			}
		}
	];
	// Define the paths for the TimeMix block in the Sankey diagram.
	// These paths connect the RKV outputs to the head block, then to the WKV, RWKV, and finally to the output.
	// Many paths have both a visible "thin line" and an invisible "background" region for easier mouse interaction.
	// Each path object may specify:
	//   - from: CSS selector for source element(s)
	//   - to: CSS selector for target element(s)
	//   - gradientId: gradient id for SVG fill
	//   - opacity: path opacity (0 for invisible backgrounds, TIMEMIX_HEAD_1 for visible lines)
	//   - curve: curve offset for path shape
	//   - id: unique id for the path (used for selection and interaction)
	//   - pathGenerator: custom function to generate SVG path string
	//   - onMouseOver, onMouseOut, onMouseClick: event handlers for interactive regions
	$: timemixPaths = [
		// RKV Receptance vector to head block Receptance
		{
			from: '.rkv .rkv-column .receptance .sub-vector.head1',
			to: '.head-block .receptance .vector',
			// fill: theme.colors.blue[200]
			gradientId: 'blue-blue',
			opacity: TIMEMIX_HEAD_1
		},

		// RKV Key vector to head block Key
		{
			from: '.rkv .rkv-column .key .sub-vector.head1',
			to: '.head-block .key .vector',
			// fill: theme.colors.red[200]
			gradientId: 'red-red',
			opacity: TIMEMIX_HEAD_1
		},
		
		// RKV Value vector to head block Value
		{
			from: '.rkv .rkv-column .value .sub-vector.head1',
			to: '.head-block .value .vector',
			// fill: theme.colors.green[200]
			gradientId: 'green-green',
			opacity: TIMEMIX_HEAD_1
		},

		// Key -> WKV (background region for mouse interaction)
		{
			from: '.head-block .key .vector',
			to: '.head-block .wkv .vector',
			gradientId: 'red-yellow',
			opacity: TIMEMIX_HEAD_1,
			// fill: theme.colors.purple[200]
			curve: curveFactor * 30,
			unique: true,
			type: 'stroke',
			id: 'key-to-wkv',
			pathGenerator: (source, target, curve: number) => {
				const scrollTop = window.scrollY;
				const scrollLeft = window.scrollX;

				const rightOffset = 30; // Offset to visually separate the path from the source
				const { curveOffset } = pathAdjustor(source, target, curve);
				return `
					M ${source.right + scrollLeft},${source.top + scrollTop}
					L ${source.right + rightOffset + scrollLeft},${source.top + scrollTop}
					C ${source.right + rightOffset + scrollLeft + curveOffset},${source.top + scrollTop} ${target.left + scrollLeft - curveOffset},${target.top + scrollTop} ${target.left + scrollLeft},${target.top + scrollTop}
					L ${target.left + scrollLeft},${target.bottom + scrollTop}
					C ${target.left + scrollLeft - curveOffset},${target.bottom + scrollTop} ${source.right + rightOffset + scrollLeft + curveOffset},${source.bottom + scrollTop} ${source.right + rightOffset + scrollLeft},${source.bottom + scrollTop}
					L ${source.right + scrollLeft},${source.bottom + scrollTop}
					Z
				`;
			},
			onMouseOver: () => {
				d3.select('path.key-to-wkv').transition().duration(100).style('opacity', 0.8);

				tooltip.set('click to see WKV calculation');
			},
			onMouseOut: () => {
				d3.select('path.key-to-wkv').transition().duration(100).style('opacity', TIMEMIX_OUT);

				tooltip.set(null);
			},
			onMouseClick: (e, d) => {
				e.stopPropagation();

				if ($weightPopover === 'tmix-wkv') weightPopover.set(null);
				else weightPopover.set('tmix-wkv');
			}
		
			
		},

		// Value to WKV (background region for mouse interaction)
		{
			from: '.head-block .value .vector',
			to: '.head-block .wkv .vector',
			gradientId: 'green-yellow',
			opacity: TIMEMIX_HEAD_1,
			type: 'stroke',
			unique: true,
			id: 'value-to-wkv',
			// fill: theme.colors.purple[200]
			curve: curveFactor * 30,
			pathGenerator: (source, target, curve) => {
				let curveOffset = curve;

				const scrollTop = window.scrollY;
				const scrollLeft = window.scrollX;

				const sourceMiddleY = source.top + scrollTop + source.height / 2;
				const targetMiddleY = target.top + scrollTop + target.height / 2;
				const controlPoint1X = source.right + scrollLeft + curveOffset;
				const controlPoint2X = target.left + scrollLeft - curveOffset;

				return `
			    M ${source.right + scrollLeft},${sourceMiddleY}
			    C ${controlPoint1X},${sourceMiddleY} ${controlPoint2X},${targetMiddleY} ${target.left + scrollLeft},${targetMiddleY}
					L ${target.right + scrollLeft},${targetMiddleY}
			`;
			},
			onMouseOver: () => {
				d3.select('path.value-to-wkv').transition().duration(100).style('opacity', 0.8);

				tooltip.set('click to see WKV calculation');
			},
			onMouseOut: () => {
				d3.select('path.value-to-wkv')
					.transition()
					.duration(100)
					.style('opacity', TIMEMIX_OUT);

				tooltip.set(null);
			},
			onMouseClick: (e, d) => {
				e.stopPropagation();

				if ($weightPopover === 'tmix-wkv') weightPopover.set(null);
				else weightPopover.set('tmix-wkv');
			}
		},

		// Receptance to RWKV (background region for mouse interaction)
		{
			from: '.head-block .receptance .vector',
			to: `.head-block .rwkv .vector`,
			gradientId: 'blue-purple',
			id: 'receptance-to-rwkv',
			unique: true,
			type: 'stroke',
			opacity: TIMEMIX_HEAD_1,
			curve: curveFactor * 30,
			pathGenerator: (source, target, curve) => {
				let curveOffset = curve;

				const scrollTop = window.scrollY;
				const scrollLeft = window.scrollX;

				const sourceMiddleY = source.top + scrollTop + source.height / 2;
				const targetMiddleY = target.top + scrollTop + target.height / 2;
				const controlPoint1X = source.right + scrollLeft + curveOffset;
				const controlPoint2X = target.left + scrollLeft - curveOffset;

				return `
			    M ${source.right + scrollLeft},${sourceMiddleY}
			    C ${controlPoint1X},${sourceMiddleY} ${controlPoint2X},${targetMiddleY} ${target.left + scrollLeft},${targetMiddleY}
					L ${target.right + scrollLeft},${targetMiddleY}
			`;
			},
			onMouseOver: () => {
				d3.select('path.receptance-to-rwkv').transition().duration(100).style('opacity', 0.8);

				tooltip.set('click to see SR calculation');
			},
			onMouseOut: () => {
				d3.select('path.value-to-out').transition().duration(100).style('opacity', TIMEMIX_OUT);

				tooltip.set(null);
			},
			onMouseClick: (e, d) => {
				e.stopPropagation();

				if ($weightPopover === 'tmix-sr') weightPopover.set(null);
				else weightPopover.set('tmix-sr');
			}
		
		},
		
		// WKV to RWKV (background region for mouse interaction)
		{
			from: '.head-block .wkv .wkv .vector',
			to: '.head-block .rwkv .rwkv .vector',
			gradientId: 'yellow-purple2',
			id: 'wkv-to-rwkv',
			unique: true,
			type: 'stroke',
			opacity: TIMEMIX_OUT,
			curve: 20,
			pathGenerator: (source, target, curve: number) => {
				const scrollTop = window.scrollY;
				const scrollLeft = window.scrollX;

				const rightOffset = 30; // Offset to visually separate the path from the source
				const { curveOffset } = pathAdjustor(source, target, curve);
				return `
			    M ${source.right + scrollLeft},${source.top + scrollTop}
					L ${source.right + rightOffset + scrollLeft},${source.top + scrollTop}
					C ${source.right + rightOffset + scrollLeft + curveOffset},${source.top + scrollTop} ${target.left + scrollLeft - curveOffset},${target.top + scrollTop} ${target.left + scrollLeft},${target.top + scrollTop}
			    L ${target.left + scrollLeft},${target.bottom + scrollTop}
					C ${target.left + scrollLeft - curveOffset},${target.bottom + scrollTop} ${source.right + rightOffset + scrollLeft + curveOffset},${source.bottom + scrollTop} ${source.right + rightOffset + scrollLeft},${source.bottom + scrollTop}
					L ${source.right + scrollLeft},${source.bottom + scrollTop}
			    Z
			`;
			},
			onMouseOver: () => {
				// Highlight all RKV paths and show tooltip
				const paths = d3.select(`g.rwkv`).selectAll('path');
				paths.transition().duration(100).style('opacity', 1);
				tooltip.set('click to see RKV calculation');
			},
			onMouseOut: () => {
				// Reset opacity and hide tooltip
				const paths = d3.select(`g.rwkv`).selectAll('path');
				paths.transition().duration(100).style('opacity', EMBEDDING);
				tooltip.set(null);
			},
			onMouseClick: (e, d) => {
				e.stopPropagation();

				if ($weightPopover === 'tmix-rwkv') weightPopover.set(null);
				else weightPopover.set('tmix-rwkv');
			}
		},
		
		// RWKV to Out
		{
			from: '.head-block .rwkv .vector',
			to: '.head-block .rwkvout .vector',
			gradientId: 'purple-purple',
			id: 'rwkv-to-out',
			unique: true,
			opacity: TIMEMIX_OUT,
			curve: curveFactor * 30,
			pathGenerator: (source, target, curve: number) => {
				const scrollTop = window.scrollY;
				const scrollLeft = window.scrollX;

				const rightOffset = 30; // Offset to visually separate the path from the source
				const { curveOffset } = pathAdjustor(source, target, curve);
				return `
        M ${source.right + scrollLeft},${source.top + scrollTop} 
					L ${source.right + rightOffset + scrollLeft},${source.top + scrollTop}
					C ${source.right + rightOffset + scrollLeft + curveOffset},${source.top + scrollTop} ${target.left + scrollLeft - curveOffset},${target.top + scrollTop} ${target.left + scrollLeft},${target.top + scrollTop}
        L ${target.left + scrollLeft},${target.bottom + scrollTop}
					C ${target.left + scrollLeft - curveOffset},${target.bottom + scrollTop} ${source.right + rightOffset + scrollLeft + curveOffset},${source.bottom + scrollTop} ${source.right + rightOffset + scrollLeft},${source.bottom + scrollTop}
					L ${source.right + scrollLeft},${source.bottom + scrollTop}
        Z
    `;
			},
			onMouseOver: () => {
				d3.select('path.rwkv-to-out').transition().duration(100).style('opacity', 0.8);

				tooltip.set('click to see TimeMix Out calculation');
			},
			onMouseOut: () => {
				d3.select('path.rwkv-to-out').transition().duration(100).style('opacity', TIMEMIX_OUT);

				tooltip.set(null);
			},
			onMouseClick: (e, d) => {
				e.stopPropagation();

				if ($weightPopover === 'tmix-rwkvout') weightPopover.set(null);
				else weightPopover.set('tmix-rwkvout');
			}
		}
	];
	
	$: cmixUpPaths = [
		{
			from: '.cmix .column.initial .vector',
			to: '.cmix .second-layer .vector',
			gradientId: 'purple-indigo',
			curve: 50 + (curveFactor - 1) * 20,
			opacity: CMIX,
			pathGenerator: (source, target, curve: number) => {
				const scrollTop = window.scrollY;
				const scrollLeft = window.scrollX;

				const rightOffset = rootRem * 3;
				const { curveOffset } = pathAdjustor(source, target, curve);
				return `
					M ${source.right + scrollLeft},${source.top + scrollTop}
					L ${source.right + rightOffset + scrollLeft},${source.top + scrollTop}
					C ${source.right + rightOffset + scrollLeft + curveOffset},${source.top + scrollTop} ${target.left + scrollLeft - curveOffset},${target.top + scrollTop} ${target.left + scrollLeft},${target.top + scrollTop}
					L ${target.left + scrollLeft},${target.bottom + scrollTop}
					C ${target.left + scrollLeft - curveOffset},${target.bottom + scrollTop} ${source.right + rightOffset + scrollLeft + curveOffset},${source.bottom + scrollTop} ${source.right + rightOffset + scrollLeft},${source.bottom + scrollTop}
					L ${source.right + scrollLeft},${source.bottom + scrollTop}
					Z
				`;
			},
			onMouseOver: () => {
				const paths = d3.select(`g.cmixUp`).selectAll('path');
				paths.transition().duration(100).style('opacity', 0.6);
				tooltip.set('click to see ChannelMix process');
			},
			onMouseOut: () => {
				const paths = d3.select(`g.cmixUp`).selectAll('path');
				paths.transition().duration(100).style('opacity', CMIX);
				tooltip.set(null);
			},
			onMouseClick: (e, d) => {
				e.stopPropagation();

				if ($weightPopover === 'cmix-up') weightPopover.set(null);
				else weightPopover.set('cmix-up');
			}
		}
	];
	$: cmixDownPaths = [
		{
			from: '.cmix .second-layer .vector',
			to: '.cmix .column.out .vector',
			gradientId: 'indigo-blue',
			curve: 50 + (curveFactor - 1) * 20,
			opacity: CMIX,
			pathGenerator: (source, target, curve: number) => {
				const scrollTop = window.scrollY;
				const scrollLeft = window.scrollX;

				const leftOffset = rootRem * 1.5;
				const { curveOffset } = pathAdjustor(source, target, curve);
				return `
					M ${source.right + scrollLeft},${source.top + scrollTop}
					C ${source.right + scrollLeft + curveOffset},${source.top + scrollTop} ${target.left - leftOffset + scrollLeft - curveOffset},${target.top + scrollTop} ${target.left - leftOffset + scrollLeft},${target.top + scrollTop}
					L ${target.left + scrollLeft},${target.top + scrollTop}
					L ${target.left + scrollLeft},${target.bottom + scrollTop}
					L ${target.left - leftOffset + scrollLeft},${target.bottom + scrollTop}
					C ${target.left - leftOffset + scrollLeft - curveOffset},${target.bottom + scrollTop} ${source.right + scrollLeft + curveOffset},${source.bottom + scrollTop} ${source.right + scrollLeft},${source.bottom + scrollTop}
					L ${source.right + scrollLeft},${source.bottom + scrollTop}
					Z
				`;
			},
			onMouseOver: () => {
				const paths = d3.select(`g.cmixDown`).selectAll('path');
				paths.transition().duration(100).style('opacity', 0.6);
				tooltip.set('click to see ChannelMix process');
			},
			onMouseOut: () => {
				const paths = d3.select(`g.cmixDown`).selectAll('path');
				paths.transition().duration(100).style('opacity', CMIX);
				tooltip.set(null);
			},
			onMouseClick: (e, d) => {
				e.stopPropagation();

				if ($weightPopover === 'cmix-down') weightPopover.set(null);
				else weightPopover.set('cmix-down');
			}
		}
	];

	$: pathMap = {
		embedding: [
			{
				from: '.embedding .vector-column .column.vectors .vector',
				to: '.block-steps.main .rkv .vector-column .column.vectors .vector',
				gradientId: 'gray-white-blue',
				opacity: RWKV_BLOCKS
			}
		],
		rkv: rkvPaths.map((d) => ({
			...d,
			from: `.block-steps.main ${d.from}`,
			to: `.block-steps.main ${d.to}`
		})),
		nextRkv: rkvPaths.map((d) => ({
			...d,
			from: `.block-steps.next ${d.from}`,
			to: `.block-steps.next ${d.to}`
		})),
		timemix: timemixPaths.map((d) => ({
			...d,
			from: `.block-steps.main ${d.from}`,
			to: `.block-steps.main ${d.to}`
		})),
		nextTimeMix: timemixPaths.map((d) => ({
			...d,
			from: `.block-steps.next ${d.from}`,
			to: `.block-steps.next ${d.to}`
		})),
		cmixUp: cmixUpPaths.map((d) => ({
			...d,
			from: `.block-steps.main ${d.from}`,
			to: `.block-steps.main ${d.to}`
		})),
		cmixDown: cmixDownPaths.map((d) => ({
			...d,
			from: `.block-steps.main ${d.from}`,
			to: `.block-steps.main ${d.to}`
		})),
		nextCMixUp: cmixUpPaths.map((d) => ({
			...d,
			from: `.block-steps.next ${d.from}`,
			to: `.block-steps.next ${d.to}`
		})),
		nextCMixDown: cmixDownPaths.map((d) => ({
			...d,
			from: `.block-steps.next ${d.from}`,
			to: `.block-steps.next ${d.to}`
		})),
		'rwkv-blocks': [
			{
				from: `.block-steps.${$isOnBlockTransition ? 'next' : 'main'} .cmix .column.out .vector`,
				to: '.rwkv-blocks .column.final .vector',
				gradientId: $blockIdx === $modelMeta.layer_num - 1 ? 'blue' : 'blue-white-blue',
				opacity: $blockIdx === $modelMeta.layer_num - 1 ? CMIX : RWKV_BLOCKS,
				pathGenerator: (source, target, curve) => {
					const scrollTop = window.scrollY;
					const scrollLeft = window.scrollX;
					const { curveOffset } = pathAdjustor(source, target, curve);
					return `
        M ${source.right + scrollLeft},${source.top + scrollTop}
        C ${source.right + scrollLeft + curveOffset},${source.top + scrollTop} ${target.left + scrollLeft - curveOffset},${target.top + scrollTop} ${target.left + scrollLeft},${target.top + scrollTop}
        L ${target.left + scrollLeft},${target.bottom + scrollTop}
        C ${target.left + scrollLeft - curveOffset},${target.bottom + scrollTop} ${source.right + scrollLeft + curveOffset},${source.bottom + scrollTop} ${source.right + scrollLeft},${source.bottom + scrollTop}
        Z
    `;
				}
			}
		],
		softmax: [
			{
				from: '.rwkv-blocks .final .vector.last-token',
				to: '.softmax .content .vector',
				gradientId: 'blue-gray',
				opacity: LOGIT,
				unique: true,
				onMouseOver: () => {
					const paths = d3.select(`g.softmax`).selectAll('path');
					paths.transition().duration(100).style('opacity', 1);
					tooltip.set('click to see Logits calculation');
					// showTooltip('');
				},
				onMouseOut: () => {
					const paths = d3.select(`g.softmax`).selectAll('path');
					paths.transition().duration(100).style('opacity', LOGIT);
					// hideTooltip();
					tooltip.set(null);
				},
				onMouseClick: (e, d) => {
					e.stopPropagation();

					if ($weightPopover === 'softmax') weightPopover.set(null);
					else weightPopover.set('softmax');
				}
			}
		]
	};

	const createGradients = () => {
		const svg = d3.select(svgEl);
		const defs = svg.append('defs');

		Object.keys(gradientMap).forEach((key) => {
			const stops = gradientMap[key];
			const grad = defs
				.append('linearGradient')
				.attr('id', key)
				.attr('class', key)
				.attr('x1', '0%')
				.attr('y1', '0%')
				.attr('x2', '100%')
				.attr('y2', '0%');

			const gradClone = defs
				.append('linearGradient')
				.attr('id', key + '-last')
				.attr('class', key)
				.attr('x1', '0%')
				.attr('y1', '0%')
				.attr('x2', '100%')
				.attr('y2', '0%');

			Object.keys(stops).forEach((stop) => {
				let color, opacity;
				if (typeof stops[stop] !== 'string') {
					color = stops[stop].color;
					opacity = stops[stop].opacity;
				} else {
					color = stops[stop];
					opacity = 1;
				}

				grad
					.append('stop')
					.attr('offset', `${stop}%`)
					.attr('stop-color', color)
					.attr('stop-opacity', opacity);

				gradClone
					.append('stop')
					.attr('offset', `${stop}%`)
					.attr('stop-color', color)
					.attr('stop-opacity', opacity);
			});
		});
	};

	const drawPath = async () => {
		await tick();
		const svg = d3.select(svgEl);
		const svgBack = d3.select(svgBackEl);

		[
			{ dataMap: pathMap, svg },
			{ dataMap: backPathMap, svg: svgBack }
		].forEach(({ dataMap, svg }) => {
			const g = svg
				.selectAll('g.path-group')
				.data(Object.keys(dataMap))
				.join('g')
				.attr('class', (d) => `path-group ${d}`);

			g.selectAll('path.sankey-path')
				.data((d) => {
					const data = dataMap[d].map((item) => {
						const { from, to, curve, pathGenerator, gradientId, unique, ...rest } = item;
						const sources = d3.selectAll(from).nodes() as Element[];
						const targets = d3.selectAll(to).nodes() as Element[];

						return sources.map((src, i) => {
							const source = src?.getBoundingClientRect();
							const target = targets[i]?.getBoundingClientRect();

							const curveOffset = curve || defaultCurveOffset;

							const generator = pathGenerator || defaultPathGenerator;
							const path = source && target ? generator(source, target, curveOffset) : '';

							const isLast = targets.length > 1 && i === sources.length - 1;
							let gradUrl = gradientId;

							if (isLast && !unique && document.getElementById(gradientId + '-last')) {
								gradUrl = gradientId + '-last';
							}

							return {
								isLast: i === sources.length - 1,
								path,
								fill:
									item.type === 'stroke'
										? 'none'
										: item.gradientId
											? `url(#${gradUrl})`
											: item.fill,
								opacity: item.opacity,
								stroke:
									item.type === 'stroke'
										? item.gradientId
											? `url(#${item.gradientId})`
											: item.fill
										: 'none',
								clickable: !!item.onMouseClick,
								...rest
							};
						});
					});

					return data.flat();
				})
				.join('path')
				.attr('class', (d) => `sankey-path ${d.id || ''} ${d.isLast ? 'last' : ''}`)
				.attr('fill', (d) => d.fill)
				.attr('stroke', (d) => d.stroke)
				.attr('stroke-width', 2)
				.attr('opacity', (d) => d.opacity)
				.attr('cursor', (d) => d.clickable && 'pointer')
				.attr('d', (d) => d.path)
				.on('mouseenter', (e, d) => d.onMouseOver?.(d))
				.on('mouseleave', (e, d) => d.onMouseOut?.(d))
				.on('click', (e, d) => d.onMouseClick?.(e, d));
		});
	};

	const defaultPathGenerator = (source, target, curve: number) => {
		const scrollTop = window.scrollY;
		const scrollLeft = window.scrollX;
		const { curveOffset } = pathAdjustor(source, target, curve);

		return `
        M ${source.right + scrollLeft},${source.top + scrollTop}
        C ${source.right + scrollLeft + curveOffset},${source.top + scrollTop} ${target.left + scrollLeft - curveOffset},${target.top + scrollTop} ${target.left + scrollLeft},${target.top + scrollTop}
        L ${target.left + scrollLeft},${target.bottom + scrollTop}
        C ${target.left + scrollLeft - curveOffset},${target.bottom + scrollTop} ${source.right + scrollLeft + curveOffset},${source.bottom + scrollTop} ${source.right + scrollLeft},${source.bottom + scrollTop}
        Z
    `;
	};

	const pathAdjustor = (source, target, curve: number) => {
		const distance = target.left - source.right;
		const maxDistance = 100;

		const curveOffset = distance > maxDistance ? curve : curve * (distance / maxDistance);

		return { curveOffset };
	};

	onMount(() => {
		createGradients();

		const updateSvgs = () => {
			drawPath();
			drawResidualPath();
		};

		// animate during resizing
		resizeObserver = new ResizeObserver(updateSvgs);

		const elements = document?.querySelectorAll('.resize-watch');
		elements.forEach((el) => resizeObserver.observe(el));

		const transition = document?.querySelector('.transition-watch');

		resizeObserver.observe(transition);

		// redraw when data updated
		const unsubscribeTMixIdx = timemixHeadIdx.subscribe(async (newIdx) => {
			drawPath();
		});

		return () => {
			resizeObserver.disconnect();
			unsubscribeTMixIdx();
		};
	});

	$: if (typeof window !== 'undefined') {
		if ($tokens) {
			drawPath();
			drawResidualPath();
		}
	}

	const drawResidualPath = () => {
		const svg = d3.select(svgEl);

		const starts = d3.selectAll(`.residual-start path.head`).nodes();
		const ends = d3.selectAll(`.residual-end path.head`).nodes();

		const lineData = starts.map((start, i) => {
			const startEl = start.getBoundingClientRect();
			const endEl = ends[i].getBoundingClientRect();

			const x1 = startEl.right;
			const y1 = startEl.top;
			const x2 = endEl.left;
			const y2 = endEl.top;

			return { x1, y1, x2, y2, id: start.id };
		});
		svg
			.selectAll('line.residual-connector')
			.data(lineData)
			.join('line')
			.attr('class', (d) => `residual-connector ${d.id}`)
			.attr('x1', (d) => d.x1)
			.attr('y1', (d) => d.y1)
			.attr('x2', (d) => d.x2)
			.attr('y2', (d) => d.y2)
			.attr('stroke', theme.colors.gray[400])
			.attr('stroke-width', 1)
			.attr('stroke-dasharray', '8,4')
			.style('opacity', 0);
	};
</script>

<svelte:window bind:innerWidth={screenWidth} />

<div bind:clientWidth={screenWidth} class="h-full w-full">
	<svg
		bind:this={svgBackEl}
		id="back"
		class="sankey-back absolute left-0 top-0 h-full w-full"
		style={`z-index:${$modelMeta.timemix_head_num - 1};`}
	></svg>
	<svg
		bind:this={svgEl}
		class="sankey-top absolute left-0 top-0 h-full w-full"
		style={`z-index:${$modelMeta.timemix_head_num};`}
	/>
</div>

<style lang="scss">
</style>
