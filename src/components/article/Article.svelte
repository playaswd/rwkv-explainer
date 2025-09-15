<script>
	import Katex from '~/utils/Katex.svelte';
	import { modelMeta } from '~/store';
</script>

<div id="description">
	<div class="article-section" data-click="article-intro">
		<h1>What is a RWKV?</h1>

		<p>
			RWKV is a neural network architecture that combines the strengths of recurrent neural networks (RNNs) and Transformers. RWKV was first introduced in the paper
			<a
				href="https://arxiv.org/abs/2305.13048"
				title="ACL"
				target="_blank">"RWKV: Reinventing RNNs for the Transformer Era"</a
			>
			in 2023 and has since attracted attention for its efficiency and scalability in large language models. RWKV is used in text generation, audio generation, and other sequence modeling tasks, demonstrating versatility across various domains.
		</p>
		<p>
			Like Transformer-based models, RWKV can process sequences and capture long-range dependencies, but it does so with a different architecture that avoids the quadratic complexity of self-attention. This makes RWKV suitable for efficient inference and training on long sequences.
		</p>
		<p>
			RWKV-4 (small) is a representative example of a text-generative RWKV model. RWKV Explainer is powered by the
			<a href="https://huggingface.co/BlinkDL/rwkv-4-pile-169m" title="Hugging Face" target="_blank"
				>RWKV-4 (small)</a
			>
			model, which has 169 million parameters. While it is not the largest RWKV model, it contains all the essential architectural components and mechanisms found in state-of-the-art RWKV models, making it an ideal starting point for understanding the basics of this architecture.
		</p>
	</div>

	<div class="article-section" data-click="article-overview">
		<h1>RWKV Architecture</h1>
		<p>
			Every text-generative RWKV model consists of these <strong>three key components</strong>:
		</p>
		<ol>
			<li>
				<strong class="bold-purple">Embedding</strong>: Text input is divided into smaller units
				called tokens, which can be words or subwords. These tokens are converted into numerical
				vectors called embeddings, which capture the semantic meaning of words.
			</li>
			<li>
				<strong class="bold-purple">RWKV Block</strong> is the fundamental building block of
				the model that processes and transforms the input data. Each block includes:
				<ul class="">
					<li>
						<strong>Timemix Mechanism</strong>: RWKV uses a time-mixing mechanism to capture dependencies between tokens, serving a similar purpose to attention in Transformers.
					</li>
					<li>
						<strong>ChannelMix Mechanism</strong>: A feed-forward network that operates
						on each token independently, refining each token's representation.
					</li>
				</ul>
			</li>
			<li>
				<strong class="bold-purple">Output Probabilities</strong>: The final linear and softmax
				layers transform the processed embeddings into probabilities, enabling the model to make
				predictions about the next token in a sequence.
			</li>
		</ol>
	</div>

	<div class="article-section" id="embedding" data-click="article-embedding">
		<h2>Embedding</h2>
		<p>
			Let's say you want to generate text using a RWKV model. You add the prompt like this
			one: <code>“Data visualization empowers users to”</code>. This input needs to be converted
			into a format that the model can understand and process. That is where embedding comes in: it
			transforms the text into a numerical representation that the model can work with. To convert a
			prompt into embedding, we first tokenize the input and then obtain a vector representation for each token. Let’s see how each of these steps is done.
		</p>
		<div class="figure">
			<img src="./article_assets/rwkv/embedding.png" width="65%" alt="Embedding process diagram" />
		</div>
		<div class="figure-caption">
			Figure <span class="timemix">1</span>. Expanding the Embedding layer view, showing how the
			input prompt is converted to a vector representation. The process involves
			<span class="fig-numbering">(1)</span> Tokenization, (2) Token Embedding.
		</div>
		<div class="article-subsection">
			<h3>Step 1: Tokenization</h3>
			<p>
				Tokenization is the process of breaking down the input text into smaller, more manageable
				pieces called tokens. These tokens can be a word or a subword. The words <code>"Data"</code>
				and <code>"visualization"</code> correspond to unique tokens, while the word
				<code>"empowers"</code>
				is split into two tokens. The full vocabulary of tokens is decided before training the model:
				RWKV-4's vocabulary has <code>50,277</code> unique tokens. Now that we split our input text into
				tokens with distinct IDs, we can obtain their vector representation from embeddings.
			</p>
		</div>
		<div class="article-subsection" id="article-token-embedding">
			<h3>Step 2. Token Embedding</h3>
			<p>
				RWKV-4 (small) represents each token in the vocabulary as a 768-dimensional vector; the
				dimension of the vector depends on the model. These embedding vectors are stored in a matrix
				of shape <code>(50,277, 768)</code>, containing approximately 39 million parameters! This
				extensive matrix allows the model to assign semantic meaning to each token.
			</p>
		</div>
		<!-- <div class="article-subsection" id="article-positional-embedding"> -->
			<!-- <h3>Step 3. Positional Encoding</h3>
			<p>
				The Embedding layer also encodes information about each token's position in the input
				prompt. Different models use various methods for positional encoding. GPT-2 trains its own
				positional encoding matrix from scratch, integrating it directly into the training process.
			</p> -->

			<!-- <div class="article-subsection-l2">
	<h4>Alternative Positional Encoding Approach <strong class='timemix'>[POTENTIALLY COLLAPSIBLE]</strong></h4>
	<p>
	  Other models, like the original Transformer and BERT,
	  use sinusoidal functions for positional encoding.

	  This sinusoidal encoding is deterministic and designed to reflect
	  the absolute as well as the relative position of each token.
	</p>
	<p>
	  Each position in a sequence is assigned a unique mathematical
	  representation using a combination of sine and cosine functions.

	  For a given position, the sine function represents even dimensions,
	  and the cosine function represents odd dimensions within the positional encoding vector.

	  This periodic nature ensures that each position has a consistent encoding,
	  independent of the surrounding context.
	</p>

	<p>
	  Here’s how it works:
	</p>

	<span class='timemix'>
	  SINUSOIDAL POSITIONAL ENCODING EQUATION
	</span>

	<ul>
	  <li>
		<strong>Sine Function</strong>: Used for even indices of the embedding vector.
	  </li>
	  <li>
		<strong>Cosine Function</strong>: Used for odd indices of the embedding vector.
	</ul>

	<p>
	  Hover over individual encoding values in the matrix above to
	  see how it's calculated using the sins and cosine functions.
	</p>
  </div> -->
		<!-- </div> -->
		<!-- <div class="article-subsection">
			<h3>Step 4. Final Embedding</h3>
			<p>
				Finally, we sum the token and positional encodings to get the final embedding
				representation. This combined representation captures both the semantic meaning of the
				tokens and their position in the input sequence.
			</p>
		</div> -->
	</div>

	<div class="article-section" data-click="article-rwkv-block">
		<h2>RWKV Block</h2>

		<p>
			The core of RWKV's processing lies in the RWKV block, which consists of two main mechanisms: <strong>Timemix</strong> and <strong>ChannelMix</strong>. 
			Unlike Transformers that use multi-head self-attention, RWKV uses the Timemix mechanism to capture temporal dependencies between tokens efficiently, and ChannelMix as a feed-forward network to refine token representations. 
			Most RWKV models stack multiple such blocks sequentially, allowing token representations to evolve through layers and enabling the model to build up a deep understanding of each token in context. 
			For example, RWKV-4 (small) consists of {$modelMeta.layer_num} such blocks.
		</p>
	</div>

	<div class="article-section" id="self-timemix" data-click="article-timemix">
		<h3>Timemix: Temporal Mixing Mechanism</h3>
		<p>
			In RWKV, the <strong>Timemix</strong> mechanism replaces the self-attention of Transformers. Timemix enables the model to capture dependencies between tokens across time steps, but does so with a recurrent and efficient computation. Instead of computing attention scores between all pairs of tokens, Timemix mixes the current token's representation with a weighted sum of previous tokens, allowing the model to efficiently model long-range dependencies without quadratic complexity.
		</p>
		<div class="article-subsection-l2">
			<h4>Step 1: Receptance, Key, and Value Matrices</h4>

			<div class="figure pt-10">
				<img src="./article_assets/rwkv/WKV.png" width="80%" alt="RWKV WKV computation illustration" />
				<div class="text-xs">
					<Katex
						displayMode
						math={`
							r_t = W_r \\cdot \\left( \\mu_r \\odot x_t + \\left( 1 - \\mu_r \\right) \\odot x_{t-1} \\right), \\\\
							k_t = W_k \\cdot \\left( \\mu_k \\odot x_t + \\left( 1 - \\mu_k \\right) \\odot x_{t-1} \\right), \\\\
							v_t = W_v \\cdot \\left( \\mu_v \\odot x_t + \\left( 1 - \\mu_v \\right) \\odot x_{t-1} \\right)
						`}
						style={null}
					/>
				</div>
			</div>
			<div class="figure-caption">
				Figure <span class="timemix">2.1</span>. Computing Receptance, Key, and Value matrices from the
				original embedding.
			</div>

			<p>
				Each token's embedding vector is transformed into three vectors:
				<span class="r-color">Receptance (R)</span>,
				<span class="k-color">Key (K)</span>, and
				<span class="v-color">Value (V)</span>. These vectors are derived by multiplying the input
				embedding matrix with learned weight matrices for
				<span class="r-color">R</span>,
				<span class="k-color">K</span>, and
				<span class="v-color">V</span>. Here's an analogy to help build intuition:
			</p>
			<ul>
				<li>
					<strong class="r-color font-medium">Receptance (R)</strong> determines how much the current token should accept information from the past. It acts as a gate, controlling the flow of historical context.
				</li>
				<li>
					<strong class="k-color font-medium">Key (K)</strong> represents the information the current token offers to the future.
				</li>
				<li>
					<strong class="v-color font-medium">Value (V)</strong> is the actual content or information carried by the current token.
				</li>
			</ul>
			<p>
				By using these RKV values, the model can calculate a weighted summary of the past, which determines how much focus each token should receive when generating predictions.
			</p>
		</div>
		<div class="article-subsection-l2">
			<h4>Step 2: WKV Computation</h4>
			<div class="figure pt-10">
				<div class="img-row">
					<img src="./article_assets/rwkv/wkvt_pt.png" width="80%" alt="RWKV WKV computation illustration" />
					<img src="./article_assets/rwkv/wkvt_qt.png" width="80%" alt="RWKV WKV computation illustration" />
				</div>
				<img src="./article_assets/rwkv/wkvt.png" width="80%" alt="RWKV WKV computation illustration" />
			</div>
			<div class="figure-caption">
				Figure <span class="timemix">2.2</span>. The WKV computation combines the current token's K/V pair with a time-decaying weighted sum of past K/V pairs.
			</div>
			<div class="text-xs">
					<Katex
						displayMode
						math={`
wkv_t = \\frac{ \\sum_{i=1}^{t-1} e^{-(t-1-i)w + k_i} \\odot v_i + e^{u + k_t} \\odot v_t }{ \\sum_{i=1}^{t-1} e^{-(t-1-i)w + k_i} + e^{u + k_t} }
		`}
						style={null}
					/>
			</div>
			<p>
				The core of the Timemix mechanism is the <strong>WKV (Weighted Key-Value)</strong> computation, as shown in the formula above. It's a form of time-weighted averaging. For each token <code>t</code>, it computes a value <code>wkv_t</code> by combining its own Key-Value pair (<code>k_t</code>, <code>v_t</code>) with a sum of all previous Key-Value pairs (<code>k_i</code>, <code>v_i</code> for <code>i &lt; t</code>).
			</p>
			<p>
				A crucial element is the <strong>time-decay factor <code>w</code></strong>, a learnable parameter. The term <code>e^&#123;-(t-1-i)w&#125;</code> ensures that the influence of tokens from the distant past decays exponentially, allowing the model to prioritize more recent information while still retaining long-term memory. This recurrent formulation avoids the quadratic complexity of standard attention, making it highly efficient for long sequences.
			</p>
		</div>
		<div class="article-subsection-l2">
			<h4>Step 3: RWKV Computation</h4>
			<p>
				The computed <code>wkv</code> vector is then combined with the token's Receptance vector (<code>R</code>) through element-wise multiplication (gating). This allows the model to selectively decide which information from the time-mixed context is relevant for the current token.
			</p>

			<div class="figure">
				<img src="./article_assets/rwkv/RWKV.png" width="80%" alt="Timemix mechanism schematic" />
			</div>
			<div class="figure-caption">
				Figure <span class="timemix">2.3</span>. The final Timemix output is produced by gating the WKV result with the Receptance vector.
			</div>

		</div>
		<div class="article-subsection-l2">
			<h4>Step 4: Output Projection</h4>
			<p>
				This gated result is then passed through a final linear projection layer (the <span class="v-color">Output</span> matrix) to produce the <span class="purple-color">final output</span> of the Timemix block. This output now contains rich contextual information from previous tokens.
			</p>
			<div class="figure">
				<img src="./article_assets/rwkv/tmixoutput.png" width="80%" alt="Timemix output projection" />
			</div>
			<div class="figure-caption">
				Figure <span class="timemix">2.4</span>. The final Timemix output is produced by passing the gated WKV result through the Output matrix.
			</div>
		</div>
	</div>

	<div class="article-section" id="article-activation" data-click="article-mlp">
		<h3>ChannelMix: Feed-Forward Network</h3>
		<div class="figure">
			<img src="./article_assets/rwkv/ChannelMix.png" width="70%" alt="ChannelMix feed-forward network diagram" />
		</div>
		<div class="figure-caption">
			Figure <span class="timemix">3.1</span>. The ChannelMix mechanism refines token representations independently, similar to a feed-forward network.
		</div>

		<p>
			After the Timemix mechanism captures the temporal relationships between the input
			tokens, the outputs are passed through the ChannelMix layer to
			further enhance the model's representational capacity. The ChannelMix block consists of two linear
			transformations with a nonlinear activation function in between (i.e. <code>ReLU(x)^2 = (max(0, x))^2</code>). The first linear transformation
			increases the dimensionality of the input four-fold from <code>768</code>
			to <code>3072</code>. The second linear transformation reduces the dimensionality back to the
			original size of <code>768</code>, ensuring that the subsequent layers receive inputs of
			consistent dimensions. Unlike Timemix, ChannelMix processes tokens
			independently and simply maps them from one representation to another.
		</p>
	</div>

	<div class="article-section" id="article-prob" data-click="article-prob">
		<h2>Output Probabilities</h2>
		<p>
			After the input has been processed through all RWKV blocks, the output is passed
			through the final linear layer to prepare it for token prediction. This layer projects the
			final representations into a <code>50,277</code>
			dimensional space, where every token in the vocabulary has a corresponding value called
			<code>logit</code>. Any token can be the next word, so this process allows us to simply rank
			these tokens by their likelihood of being that next word. We then apply the softmax function
			to convert the logits into a probability distribution that sums to one. This will allow us to
			sample the next token based on its likelihood.
		</p>

		<div class="figure py-5">
			<img src="./article_assets/rwkv/softmax.png" width="70%" alt="Softmax probability distribution illustration" />
		</div>
		<div class="figure-caption">
			Figure <span class="timemix">4</span>. Each token in the vocabulary is assigned a
			probability based on the model's output logits. These probabilities determine the likelihood
			of each token being the next word in the sequence.
		</div>

		<p id="article-temperature" data-click="article-temperature">
			The final step is to generate the next token by sampling from this distribution The <code
				>temperature</code
			>
			hyperparameter plays a critical role in this process. Mathematically speaking, it is a very simple
			operation: model output logits are simply divided by the
			<code>temperature</code>:
		</p>

		<ul>
			<li>
				<code>temperature = 1</code>: Dividing logits by one has no effect on the softmax outputs.
			</li>
			<li>
				<code>temperature &lt; 1</code>: Lower temperature makes the model more confident and
				deterministic by sharpening the probability distribution, leading to more predictable
				outputs.
			</li>
			<li>
				<code>temperature &gt; 1</code>: Higher temperature creates a softer probability
				distribution, allowing for more randomness in the generated text – what some refer to as
				model <em>“creativity”</em>.
			</li>
		</ul>

		<p id="article-sampling" data-click="article-sampling">
			In addition, the sampling process can be further refined using <code>top-k</code>
			and
			<code>top-p</code> parameters:
		</p>
		<ul>
			<li>
				<code>top-k sampling</code>: Limits the candidate tokens to the top k tokens with the
				highest probabilities, filtering out less likely options.
			</li>
			<li>
				<code>top-p sampling</code>: Considers the smallest set of tokens whose cumulative
				probability exceeds a threshold p, ensuring that only the most likely tokens contribute
				while still allowing for diversity.
			</li>
		</ul>
		<p>
			By tuning <code>temperature</code>, <code>top-k</code>, and <code>top-p</code>, you can
			balance between deterministic and diverse outputs, tailoring the model's behavior to your
			specific needs.
		</p>
	</div>

	<div class="article-section" data-click="article-advanced-features">
		<h2>Advanced Architectural Features</h2>

		<p>
			There are several advanced architectural features that enhance the performance of RWKV
			models. While important for the model's overall performance, they are not as important for
			understanding the core concepts of the architecture. Layer Normalization, and
			Residual Connections are crucial components in RWKV models, particularly during the
			training phase. Layer Normalization stabilizes training and helps the model converge faster.
			Residual Connections allows gradients to flow directly through the network and helps to prevent the vanishing gradient
			problem.
		</p>
		<div class="article-subsection" id="article-ln">
			<h3>Layer Normalization</h3>

			<p>
				Layer Normalization helps to stabilize the training process and improves convergence. It
				works by normalizing the inputs across the features, ensuring that the mean and variance of
				the activations are consistent. This normalization helps mitigate issues related to internal
				covariate shift, allowing the model to learn more effectively and reducing the sensitivity
				to the initial weights. Layer Normalization is applied twice in each RWKV block, once
				before the timemix mechanism and once before the channelmix layer.
			</p>
		</div>
		
		<div class="article-subsection" id="article-residual">
			<h3>Residual Connections</h3>

			<p>
				Residual connections were first introduced in the ResNet model in 2015. This architectural
				innovation revolutionized deep learning by enabling the training of very deep neural
				networks. Essentially, residual connections are shortcuts that bypass one or more layers,
				adding the input of a layer to its output. This helps mitigate the vanishing gradient
				problem, making it easier to train deep networks with multiple RWKV blocks stacked on
				top of each other. In RWKV-4, residual connections are used twice within each RWKV
				block: once before the ChannelMix and once after, ensuring that gradients flow more easily, and
				earlier layers receive sufficient updates during backpropagation.
			</p>
		</div>
	</div>

	<div class="article-section" data-click="article-interactive-features">
		<h1>Interactive Features</h1>
		<p>
			RWKV Explainer is built to be interactive and allows you to explore the inner workings
			of the RWKV. Here are some of the interactive features you can play with:
		</p>

		<ul>
			<li>
				<strong>Input your own text sequence</strong> to see how the model processes it and predicts
				the next word. Explore timemix weights, intermediate computations, and see how the final output
				probabilities are calculated.
			</li>
			<li>
				<strong>Use temperature slider</strong> to control the randomness of the model’s predictions.
				Explore how you can make the model output more deterministic or more creative by changing the
				temperature value.
			</li>
			<li>
				<strong>Select top-k and top-p sampling methods</strong> to adjust sampling behavior during inference.
				Experiment with different values and see how the probability distribution changes and influences
				the model's predictions.
			</li>
			<!-- <li>
				<strong>Interact with timemix maps</strong> to see how the model focuses on different tokens
				in the input sequence. Hover over tokens to highlight their timemix weights and explore how
				the model captures context and relationships between words.
			</li> -->
		</ul>
	</div>

	<div class="article-section" data-click="article-video">
		<!-- <h2>Video Tutorial</h2>
		<div class="video-container">
			<iframe
				src="https://www.youtube.com/embed/xxxxxx"
				frameborder="0"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowfullscreen
			>
			</iframe>
		</div>
		TBD -->
	</div>

	<div class="article-section" data-click="article-implementation">
		<h2>How is RWKV Explainer Implemented?</h2>
		<p>
			RWKV Explainer features a live RWKV-4 (small) model running directly in the browser.
			This model is derived from the PyTorch implementation of RWKV by
			<a href="https://github.com/BlinkDL/RWKV-LM" title="Github" target="_blank">BlinkDL</a>
			and has been converted to
			<a href="https://onnxruntime.ai/" title="ONNX" target="_blank">ONNX Runtime</a>
			for seamless in-browser execution. The interface is built using JavaScript, with
			<a href="https://kit.svelte.dev/" title="Svelte" target="_blank">Svelte</a>
			as a front-end framework and
			<a href="https://d3js.org/" title="D3" target="_blank">D3.js</a>
			for creating dynamic visualizations. Numerical values are updated live following the user input.
		</p>
	</div>

	<div class="article-section" data-click="article-credit">
		<h2>Who developed the RWKV Explainer?</h2>
		<p>
			RWKV Explainer was developed by
			<a href="https://github.com/playaswd" target="_blank">Ding Wang</a>, based on the open-source
			<a href="https://poloclub.github.io/transformer-explainer/" target="_blank">transformer-explainer</a> and <a href="https://github.com/josephrocca/rwkv-v4-web" target="_blank">rwkv-v4-web</a>.
			It adapts the original by replacing GPT with RWKV, updating diagrams and logic, while keeping a similar UI and interactive features.
		</p>
	</div>
</div>

<style lang="scss">
	a {
		color: theme('colors.blue.500');

		&:hover {
			color: theme('colors.blue.700');
		}
	}

	.bold-purple {
		color: theme('colors.purple.700');
		font-weight: bold;
	}

	code {
		color: theme('colors.gray.500');
		background-color: theme('colors.gray.50');
		font-family: theme('fontFamily.mono');
	}

	.r-color {
		color: theme('colors.blue.400');
	}

	.k-color {
		color: theme('colors.red.400');
	}

	.v-color {
		color: theme('colors.green.400');
	}

	.purple-color {
		color: theme('colors.purple.500');
	}

	.article-section {
		padding-bottom: 2rem;
	}
	.architecture-section {
		padding-top: 1rem;
	}
	.video-container {
		position: relative;
		padding-bottom: 56.25%; /* 16:9 aspect ratio */
		height: 0;
		overflow: hidden;
		max-width: 100%;
		background: #000;
	}

	.video-container iframe {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	#description {
		padding-bottom: 3rem;
		margin-left: auto;
		margin-right: auto;
		max-width: 78ch;
	}

	#description h1 {
		color: theme('colors.purple.700');
		font-size: 2.2rem;
		font-weight: 300;
		padding-top: 1rem;
	}

	#description h2 {
		color: theme('colors.purple.700');
		font-size: 2rem;
		font-weight: 300;
		padding-top: 1rem;
	}

	#description h3 {
		color: theme('colors.gray.700');
		font-size: 1.6rem;
		font-weight: 200;
		padding-top: 1rem;
	}

	#description h4 {
		color: theme('colors.gray.700');
		font-size: 1.6rem;
		font-weight: 200;
		padding-top: 1rem;
	}

	#description p {
		margin: 1rem 0;
	}

	#description p img {
		vertical-align: middle;
	}

	#description .figure-caption {
		font-size: 0.8rem;
		margin-top: 0.5rem;
		text-align: center;
		margin-bottom: 2rem;
	}

	#description ol {
		margin-left: 3rem;
		list-style-type: decimal;
	}

	#description li {
		margin: 0.6rem 0;
	}

	#description p,
	#description div,
	#description li {
		color: theme('colors.gray.600');
		line-height: 1.6;
	}

	#description small {
		font-size: 0.8rem;
	}

	#description ol li img {
		vertical-align: middle;
	}

	#description .video-link {
		color: theme('colors.blue.600');
		cursor: pointer;
		font-weight: normal;
		text-decoration: none;
	}

	#description ul {
		list-style-type: disc;
		margin-left: 2.5rem;
		margin-bottom: 1rem;
	}

	#description a:hover,
	#description .video-link:hover {
		text-decoration: underline;
	}

	.figure,
	.video {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.img-row {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 1rem;
}
.img-row img {
  width: 40%; /* or adjust as needed */
  min-width: 0;
  max-width: 100%;
}
</style>
