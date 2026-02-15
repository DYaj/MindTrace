Feature: User Login
  As a user
  I want to login to the application
  So that I can access my account

  Background:
    Given I am on the login page

  Scenario: Successful login with valid credentials
    When I enter username "test@example.com"
    And I enter password "password123"
    And I click the login button
    Then I should see the dashboard
    And I should see my username displayed

  Scenario: Failed login with invalid credentials
    When I enter username "invalid@example.com"
    And I enter password "wrongpass"
    And I click the login button
    Then I should see an error message "Invalid credentials"
    And I should remain on the login page

  Scenario Outline: Login with various user roles
    When I login as "<role>"
    Then I should see "<page>" page
    And I should have "<permissions>" permissions

    Examples:
      | role    | page       | permissions |
      | admin   | admin      | full        |
      | user    | dashboard  | read-only   |
      | guest   | limited    | view-only   |
