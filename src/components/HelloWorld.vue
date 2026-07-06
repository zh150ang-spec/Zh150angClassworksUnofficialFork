<template>
  <v-container class="fill-height">
    <v-responsive
      class="align-centerfill-height mx-auto"
      max-width="900"
    >
      <v-img
        class="mb-4"
        height="150"
        src="@/assets/logo.png"
      />

      <div class="text-center">
        <div class="text-body-medium font-weight-light mb-n1">
          Welcome to
        </div>

        <h1 class="text-display-medium font-weight-bold">
          Vuetify
        </h1>
      </div>

      <div class="py-4" />

      <v-row>
        <v-col cols="12">
          <v-card
            class="py-4"
            color="surface-variant"
            image="https://cdn.vuetifyjs.com/docs/images/one/create/feature.png"
            :prepend-icon="ICON.ROCKET_LAUNCH_OUTLINE"
            rounded="lg"
            variant="outlined"
          >
            <template #image>
              <v-img position="top right" />
            </template>

            <template #title>
              <h2 class="text-headline-medium font-weight-bold">
                Get started
              </h2>
            </template>

            <template #subtitle>
              <div class="text-body-large">
                Replace this page by removing
                <v-kbd>
                  {{ `
                  <HelloWorld/>
                  ` }}
                </v-kbd>
                in
                <v-kbd>pages/index.vue</v-kbd>
                .
              </div>
            </template>

            <v-overlay
              contained
              model-value
              opacity=".12"
              persistent
              scrim="primary"
            />
          </v-card>
        </v-col>

        <v-col cols="6">
          <v-card
            :append-icon="ICON.OPEN_IN_NEW"
            class="py-4"
            color="surface-variant"
            href="https://vuetifyjs.com/"
            :prepend-icon="ICON.TEXT_BOX_OUTLINE"
            rel="noopener noreferrer"
            rounded="lg"
            subtitle="Learn about all things Vuetify in our documentation."
            target="_blank"
            title="Documentation"
            variant="text"
          >
            <v-overlay
              contained
              model-value
              opacity=".06"
              persistent
              scrim="primary"
            />
          </v-card>
        </v-col>

        <v-col cols="6">
          <v-card
            :append-icon="ICON.OPEN_IN_NEW"
            class="py-4"
            color="surface-variant"
            href="https://vuetifyjs.com/introduction/why-vuetify/#feature-guides"
            :prepend-icon="ICON.STAR_CIRCLE_OUTLINE"
            rel="noopener noreferrer"
            rounded="lg"
            subtitle="Explore available framework Features."
            target="_blank"
            title="Features"
            variant="text"
          >
            <v-overlay
              contained
              model-value
              opacity=".06"
              persistent
              scrim="primary"
            />
          </v-card>
        </v-col>

        <v-col cols="6">
          <v-card
            :append-icon="ICON.OPEN_IN_NEW"
            class="py-4"
            color="surface-variant"
            href="https://vuetifyjs.com/components/all"
            :prepend-icon="ICON.WIDGETS_OUTLINE"
            rel="noopener noreferrer"
            rounded="lg"
            subtitle="Discover components in the API Explorer."
            target="_blank"
            title="Components"
            variant="text"
          >
            <v-overlay
              contained
              model-value
              opacity=".06"
              persistent
              scrim="primary"
            />
          </v-card>
        </v-col>

        <v-col cols="6">
          <v-card
            :append-icon="ICON.OPEN_IN_NEW"
            class="py-4"
            color="surface-variant"
            href="https://discord.vuetifyjs.com"
            :prepend-icon="ICON.ACCOUNT_GROUP_OUTLINE"
            rel="noopener noreferrer"
            rounded="lg"
            subtitle="Connect with Vuetify developers."
            target="_blank"
            title="Community"
            variant="text"
          >
            <v-overlay
              contained
              model-value
              opacity=".06"
              persistent
              scrim="primary"
            />
          </v-card>
        </v-col>
      </v-row>
    </v-responsive>
  </v-container>
</template>

<script setup>
import { ICON } from '@/utils/icons'
//
</script>
