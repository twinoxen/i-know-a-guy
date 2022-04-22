#!/usr/bin/env node
/* eslint-disable no-console */
import 'dotenv/config'
import { twitter_client, USERNAME_REG, extract_users, clean_name } from './lib/twitter.js'
import * as fs from 'fs/promises'

const SEARCH_TERM = 'miamitech' // TODO: make this a command line argument
const DESCRIPTION_TERMS = 'VC,investor,angel' // comma delimited list no spaces // TODO: make this a command line argument

export const search_tweets_for_people_who = async () => {
  try {
    const client = twitter_client(process.env?.BEARER_TOKEN || '')

    const tweets = await client.search_tweets(SEARCH_TERM)
    const tweet_ids = tweets.data.map(tweet => tweet.id)

    const usernames_mentioned_in_tweet: string[] = tweets.data
      .filter(tweet => USERNAME_REG.test(tweet.text))
      .flatMap(tweet => extract_users(tweet.text))
      .map(user => clean_name(user || ''))

    const liked_promises = tweet_ids.map(id => client.get_liked(id))
    const retweeted_by_promises = tweet_ids.map(id => client.get_retweeted(id))

    const responses = await Promise.all([...liked_promises, ...retweeted_by_promises])

    const related_usernames = responses
      .filter(response => response.data)
      .flatMap(response => response.data.map(data => data.username))

    const users = await client.lookup_users([...related_usernames, ...usernames_mentioned_in_tweet])

    const look_for_terms = DESCRIPTION_TERMS.replace(/\s/gm, '')
    const users_that = users.data.filter(user => {
      return look_for_terms
        .split(',')
        .map(term => user.description.includes(term))
        .some(Boolean)
    })

    await fs.writeFile('results.json', JSON.stringify(users_that))
  } catch (e) {
    console.log(e)
    process.exit(1)
  }

  console.log('Output written at: ./results.json')
  process.exit(0)
}

search_tweets_for_people_who()
