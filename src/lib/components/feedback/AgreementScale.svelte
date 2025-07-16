<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { cn } from '$lib/utils';
  import type { AgreementLevel } from '$lib/firebase/types';
  
  interface Props {
    currentAgreement?: AgreementLevel;
    previousAgreement?: AgreementLevel; // For vote continuity
    disabled?: boolean;
    showPrevious?: boolean;
    onAgreementChange: (level: AgreementLevel) => void;
  }

  let { 
    currentAgreement, 
    previousAgreement,
    disabled = false, 
    showPrevious = false,
    onAgreementChange 
  }: Props = $props();

  const agreementLevels: Array<{
    level: AgreementLevel;
    label: string;
    description: string;
    color: string;
    bgColor: string;
  }> = [
    {
      level: -2,
      label: 'Strongly Disagree',
      description: 'I completely disagree with this',
      color: 'text-red-700',
      bgColor: 'bg-red-100 hover:bg-red-200 border-red-300'
    },
    {
      level: -1,
      label: 'Disagree',
      description: 'I disagree with this',
      color: 'text-red-600',
      bgColor: 'bg-red-50 hover:bg-red-100 border-red-200'
    },
    {
      level: 0,
      label: 'Neutral',
      description: 'I neither agree nor disagree',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 hover:bg-gray-100 border-gray-200'
    },
    {
      level: 1,
      label: 'Agree',
      description: 'I agree with this',
      color: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100 border-green-200'
    },
    {
      level: 2,
      label: 'Strongly Agree',
      description: 'I completely agree with this',
      color: 'text-green-700',
      bgColor: 'bg-green-100 hover:bg-green-200 border-green-300'
    }
  ];

  function handleAgreementClick(level: AgreementLevel) {
    if (disabled) return;
    onAgreementChange(level);
  }

  function getSelectedClass(level: AgreementLevel): string {
    if (currentAgreement === level) {
      const config = agreementLevels.find(l => l.level === level);
      return config?.bgColor.replace('hover:', '') + ' ring-2 ring-blue-500 ring-offset-2';
    }
    return '';
  }
</script>

<div class="space-y-3">
  {#if showPrevious && previousAgreement !== undefined}
    {@const prevConfig = agreementLevels.find(l => l.level === previousAgreement)}
    <div class="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg border border-blue-200">
      <span class="font-medium">Previous round:</span>
      {#if prevConfig}
        <Badge variant="outline" class="ml-2 {prevConfig.color}">
          {prevConfig.label} ({previousAgreement > 0 ? '+' : ''}{previousAgreement})
        </Badge>
      {/if}
      <p class="text-xs mt-1">Click to keep the same rating or choose a new one</p>
    </div>
  {/if}

  <div class="space-y-2">
    <label class="text-sm font-medium">Your Agreement Level</label>
    <div class="grid gap-2">
      {#each agreementLevels as config}
        <button
          type="button"
          onclick={() => handleAgreementClick(config.level)}
          disabled={disabled}
          class={cn(
            "w-full p-4 text-left border rounded-lg transition-all duration-200",
            "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            config.bgColor,
            getSelectedClass(config.level),
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          )}
          title={config.description}
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="font-medium {config.color}">
                  {config.label}
                </span>
                <span class="text-sm text-muted-foreground">
                  ({config.level > 0 ? '+' : ''}{config.level})
                </span>
              </div>
              <p class="text-xs text-muted-foreground mt-1">
                {config.description}
              </p>
            </div>
            {#if currentAgreement === config.level}
              <div class="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                <div class="w-2 h-2 rounded-full bg-white"></div>
              </div>
            {:else if previousAgreement === config.level && showPrevious}
              <div class="w-4 h-4 rounded-full border-2 border-blue-300 bg-blue-100"></div>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  </div>

  {#if currentAgreement !== undefined}
    {#if agreementLevels.find(l => l.level === currentAgreement)}
      {@const selectedConfig = agreementLevels.find(l => l.level === currentAgreement)}
      <div class="text-sm text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
        <span class="font-medium">Selected:</span>
        <span class="ml-1 {selectedConfig.color}">
          {selectedConfig.label} ({currentAgreement > 0 ? '+' : ''}{currentAgreement})
        </span>
      </div>
    {/if}
  {/if}
</div>