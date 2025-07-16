<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { extractTopicFromText } from '$lib/firebase/ai';
	import { Wand2, Loader2, AlertCircle } from 'lucide-svelte';
	import type { Topic, ExtractTopicResponse, Panel } from '$lib/firebase/types';

	interface Props {
		topic?: Partial<Topic>;
		onSubmit: (data: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
		isSubmitting?: boolean;
		panelId: string;
		userId: string;
		panels?: Panel[];
		selectedPanelId?: string;
	}

	let { topic = {}, onSubmit, isSubmitting = false, panelId, userId, panels = [], selectedPanelId = $bindable() }: Props = $props();

	// Form states
	let mode = $state<'paste' | 'manual'>('paste');
	let rawInput = $state('');
	let isExtracting = $state(false);
	let extractionError = $state<string | null>(null);
	let extractedData = $state<ExtractTopicResponse | null>(null);

	// Form data
	let formData = $state({
		title: topic.title || '',
		description: topic.description || '',
		question: topic.question || '',
		panelId: topic.panelId || selectedPanelId || '',
		createdBy: topic.createdBy || userId,
		status: topic.status || 'active' as const,
		roundNumber: topic.roundNumber || 1,
		aiExtracted: topic.aiExtracted || false,
		aiConfidence: topic.aiConfidence,
		rawInput: topic.rawInput
	});

	async function handleExtract() {
		if (!rawInput.trim()) return;

		isExtracting = true;
		extractionError = null;

		try {
			const result = await extractTopicFromText(rawInput);
			extractedData = result;
			
			// Update form with extracted data
			formData.title = result.title;
			formData.description = result.description;
			formData.question = result.question;
			formData.aiExtracted = true;
			formData.aiConfidence = result.confidence;
			formData.rawInput = rawInput;

			// Switch to manual mode to show extracted data
			mode = 'manual';
		} catch (error) {
			extractionError = error instanceof Error ? error.message : 'Failed to extract topic';
		} finally {
			isExtracting = false;
		}
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		
		// Clean up the form data to remove undefined values
		const cleanFormData = {
			title: formData.title,
			description: formData.description,
			question: formData.question,
			panelId: formData.panelId,
			createdBy: formData.createdBy,
			status: formData.status,
			roundNumber: formData.roundNumber,
			aiExtracted: formData.aiExtracted,
			...(formData.aiConfidence !== undefined && { aiConfidence: formData.aiConfidence }),
			...(formData.rawInput !== undefined && { rawInput: formData.rawInput })
		};
		
		await onSubmit(cleanFormData);
	}

	function handleModeChange(value: string) {
		mode = value as 'paste' | 'manual';
		if (value === 'manual' && !formData.title) {
			// Reset to empty if switching to manual without extraction
			formData.title = '';
			formData.description = '';
			formData.question = '';
			formData.aiExtracted = false;
			formData.aiConfidence = undefined;
			formData.rawInput = undefined;
			extractedData = null;
		}
	}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<Tabs value={mode} onValueChange={handleModeChange}>
		<TabsList class="grid w-full grid-cols-2">
			<TabsTrigger value="paste">AI Extract</TabsTrigger>
			<TabsTrigger value="manual">Manual Entry</TabsTrigger>
		</TabsList>

		<TabsContent value="paste" class="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>Paste Your Content</CardTitle>
					<CardDescription>
						Paste meeting notes, email threads, or any text describing what you need feedback on
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<Textarea
						bind:value={rawInput}
						placeholder="Example: Hey team, we've been discussing our remote work policy. Some want full remote, others think we need office days. Executives worry about culture but employees want flexibility..."
						rows={8}
						disabled={isExtracting}
					/>
					
					{#if extractionError}
						<Alert variant="destructive">
							<AlertCircle class="h-4 w-4" />
							<AlertDescription>{extractionError}</AlertDescription>
						</Alert>
					{/if}

					<Button 
						type="button"
						onclick={handleExtract}
						disabled={!rawInput.trim() || isExtracting}
						class="w-full"
					>
						{#if isExtracting}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							Extracting...
						{:else}
							<Wand2 class="mr-2 h-4 w-4" />
							Extract Topic with AI
						{/if}
					</Button>
				</CardContent>
			</Card>
		</TabsContent>

		<TabsContent value="manual" class="space-y-6">
			{#if panels && panels.length > 0}
				<div class="space-y-2">
					<Label for="panel">Panel <span class="text-red-500">*</span></Label>
					<select 
						bind:value={selectedPanelId}
						onchange={() => {
							formData.panelId = selectedPanelId;
						}}
						id="panel" 
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						required
					>
						<option value="">Select a panel (required)</option>
						{#each panels as panel}
							<option value={panel.id}>{panel.name}</option>
						{/each}
					</select>
					<p class="text-sm text-muted-foreground">
						Select which panel of experts will provide feedback on this topic. This field is required.
					</p>
				</div>
			{/if}

			{#if extractedData && mode === 'manual' && formData.aiExtracted}
				<Alert>
					<Wand2 class="h-4 w-4" />
					<AlertDescription>
						AI extracted this topic with {Math.round((extractedData.confidence || 0) * 100)}% confidence. 
						You can edit any field below.
					</AlertDescription>
				</Alert>
			{/if}

			<div class="space-y-2">
				<Label for="title">Title</Label>
				<Input
					id="title"
					bind:value={formData.title}
					placeholder="Brief summary of the topic"
					required
					maxlength={100}
				/>
				<p class="text-sm text-muted-foreground">
					{formData.title.length}/100 characters
				</p>
			</div>

			<div class="space-y-2">
				<Label for="description">Description</Label>
				<Textarea
					id="description"
					bind:value={formData.description}
					placeholder="Provide context and background information"
					rows={3}
					required
					maxlength={500}
				/>
				<p class="text-sm text-muted-foreground">
					{formData.description.length}/500 characters
				</p>
			</div>

			<div class="space-y-2">
				<Label for="question">Question for the Panel</Label>
				<Textarea
					id="question"
					bind:value={formData.question}
					placeholder="What specific question do you want the panel to address?"
					rows={2}
					required
				/>
				<p class="text-sm text-muted-foreground">
					This is the main question experts will provide feedback on
				</p>
			</div>

			{#if extractedData?.suggestedFeedbackTypes && extractedData.suggestedFeedbackTypes.length > 0}
				<div class="space-y-2">
					<Label>Suggested Feedback Types</Label>
					<div class="flex flex-wrap gap-2">
						{#each extractedData.suggestedFeedbackTypes as type}
							<span class="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold">
								{type}
							</span>
						{/each}
					</div>
					<p class="text-sm text-muted-foreground">
						The AI suggests collecting these types of feedback for this topic
					</p>
				</div>
			{/if}
		</TabsContent>
	</Tabs>

	<div class="flex items-center justify-end gap-4">
		<Button type="button" variant="outline" href="/topics">
			Cancel
		</Button>
		<Button 
			type="submit" 
			disabled={isSubmitting || !formData.title || !formData.description || !formData.question || !selectedPanelId}
		>
			{isSubmitting ? 'Creating...' : topic?.id ? 'Update Topic' : 'Create Topic'}
		</Button>
	</div>
</form>