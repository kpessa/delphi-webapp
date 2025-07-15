<script lang="ts">
	import { mode } from 'mode-watcher';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
</script>

<svelte:head>
	<title>Theme Test - Delphi Healthcare Platform</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<h1 class="text-3xl font-bold mb-6">Theme Test Page</h1>
	
	<div class="mb-6">
		<p class="text-lg">Current mode: <strong>{mode.current}</strong></p>
	</div>
	
	<div class="grid gap-6 md:grid-cols-2">
		<Card>
			<CardHeader>
				<CardTitle>Light/Dark Mode Test</CardTitle>
				<CardDescription>
					This card should adapt to the current theme
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p>The theme toggle button is in the top navigation bar. Click the sun/moon icon to switch between light and dark modes.</p>
			</CardContent>
		</Card>
		
		<Card>
			<CardHeader>
				<CardTitle>Color Test</CardTitle>
				<CardDescription>
					Testing various color classes
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-2">
					<p class="text-primary">Primary color text</p>
					<p class="text-secondary">Secondary color text</p>
					<p class="text-muted-foreground">Muted foreground text</p>
					<p class="text-destructive">Destructive color text</p>
				</div>
			</CardContent>
		</Card>
		
		<Card class="bg-primary text-primary-foreground">
			<CardHeader>
				<CardTitle>Primary Background</CardTitle>
				<CardDescription class="text-primary-foreground/80">
					This card has a primary background
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p>Text should be readable on primary background</p>
			</CardContent>
		</Card>
		
		<Card class="bg-secondary">
			<CardHeader>
				<CardTitle>Secondary Background</CardTitle>
				<CardDescription>
					This card has a secondary background
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p>Text should be readable on secondary background</p>
			</CardContent>
		</Card>
	</div>
</div>