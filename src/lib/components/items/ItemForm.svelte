<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Select } from '$lib/components/ui/select';
	import type { Item, ItemType, ItemCategory, ItemScope } from '$lib/firebase/types';

	interface Props {
		item?: Partial<Item>;
		onSubmit: (data: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
		isSubmitting?: boolean;
	}

	let { item = {}, onSubmit, isSubmitting = false }: Props = $props();

	let formData = $state({
		type: item.type || 'initiative' as ItemType,
		category: item.category || 'clinical' as ItemCategory,
		scope: item.scope || 'system-wide' as ItemScope,
		title: item.title || '',
		description: item.description || '',
		adminIds: item.adminIds || [],
		expertIds: item.expertIds || [],
		consensusThreshold: item.consensusThreshold || 75,
		maxRounds: item.maxRounds || 3,
		currentRound: item.currentRound || 0,
		status: item.status || 'draft',
		customMetadata: item.customMetadata || {}
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();
		await onSubmit(formData);
	}

	const itemTypes: Array<{ value: ItemType; label: string }> = [
		{ value: 'initiative', label: 'Initiative' },
		{ value: 'assessment', label: 'Assessment' },
		{ value: 'consultation', label: 'Consultation' },
		{ value: 'evaluation', label: 'Evaluation' },
		{ value: 'survey', label: 'Survey' },
		{ value: 'custom', label: 'Custom' }
	];

	const itemCategories: Array<{ value: ItemCategory; label: string }> = [
		{ value: 'clinical', label: 'Clinical' },
		{ value: 'operational', label: 'Operational' },
		{ value: 'financial', label: 'Financial' },
		{ value: 'strategic', label: 'Strategic' },
		{ value: 'quality', label: 'Quality' },
		{ value: 'technology', label: 'Technology' }
	];

	const itemScopes: Array<{ value: ItemScope; label: string }> = [
		{ value: 'system-wide', label: 'System-wide' },
		{ value: 'regional', label: 'Regional' },
		{ value: 'facility', label: 'Facility' },
		{ value: 'department', label: 'Department' }
	];
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<div class="grid gap-6 md:grid-cols-3">
		<div class="space-y-2">
			<Label for="type">Type</Label>
			<Select id="type" bind:value={formData.type}>
				{#each itemTypes as type}
					<option value={type.value}>{type.label}</option>
				{/each}
			</Select>
		</div>

		<div class="space-y-2">
			<Label for="category">Category</Label>
			<Select id="category" bind:value={formData.category}>
				{#each itemCategories as category}
					<option value={category.value}>{category.label}</option>
				{/each}
			</Select>
		</div>

		<div class="space-y-2">
			<Label for="scope">Scope</Label>
			<Select id="scope" bind:value={formData.scope}>
				{#each itemScopes as scope}
					<option value={scope.value}>{scope.label}</option>
				{/each}
			</Select>
		</div>
	</div>

	<div class="space-y-2">
		<Label for="title">Title</Label>
		<Input
			id="title"
			bind:value={formData.title}
			placeholder="Enter item title"
			required
		/>
	</div>

	<div class="space-y-2">
		<Label for="description">Description</Label>
		<Textarea
			id="description"
			bind:value={formData.description}
			placeholder="Describe the purpose and goals of this Delphi process"
			rows={4}
			required
		/>
	</div>

	<div class="grid gap-6 md:grid-cols-2">
		<div class="space-y-2">
			<Label for="consensusThreshold">Consensus Threshold (%)</Label>
			<Input
				id="consensusThreshold"
				type="number"
				bind:value={formData.consensusThreshold}
				min="50"
				max="100"
				required
			/>
			<p class="text-sm text-muted-foreground">
				Percentage of agreement needed to reach consensus
			</p>
		</div>

		<div class="space-y-2">
			<Label for="maxRounds">Maximum Rounds</Label>
			<Input
				id="maxRounds"
				type="number"
				bind:value={formData.maxRounds}
				min="1"
				max="10"
				required
			/>
			<p class="text-sm text-muted-foreground">
				Maximum number of voting rounds
			</p>
		</div>
	</div>

	<div class="flex items-center justify-end gap-4">
		<Button type="button" variant="outline" href="/items">
			Cancel
		</Button>
		<Button type="submit" disabled={isSubmitting}>
			{isSubmitting ? 'Saving...' : item?.id ? 'Update Item' : 'Create Item'}
		</Button>
	</div>
</form>