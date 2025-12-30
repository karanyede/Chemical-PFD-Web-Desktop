from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from django.urls import reverse
from django.test import TestCase
from api.models import Component, Project, CanvasState, Connection
from django.core.files.uploadedfile import SimpleUploadedFile


class RegisterAPITest(APITestCase):
    def test_register_user(self):
        url = reverse('auth_register')
        data = {
            'username': 'testuser',
            'email': 'testuser@example.com',
            'password': 'testpassword123'
        }
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)

class RefreshTokenAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpassword123')
    def test_refresh_token(self):
        # First, obtain a token pair
        login_url = reverse('auth_login')
        login_data = {
            'username': 'testuser',
            'password': 'testpassword123'
        }
        login_response = self.client.post(login_url, login_data, format='json')
        refresh_token = login_response.data['refresh']

        # Now, refresh the token
        refresh_url = reverse('token_refresh')
        refresh_data = {
            'refresh': refresh_token
        }
        refresh_response = self.client.post(refresh_url, refresh_data, format='json')

        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn('access', refresh_response.data)

class LoginAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@example.com',
            password='testpassword123'
        )
    
    def test_login_user(self):
        url = reverse('auth_login')
        data = {
            'username': 'testuser',
            'password': 'testpassword123'
        }
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

class ComponentListAPITest(APITestCase):
    def setUp(self):
        Component.objects.create(
            s_no='1',
            parent='',
            name='Resistor',
            legend='R',
            suffix='R',
            object='Object',
            grips='Grips'
        )
        Component.objects.create(
            s_no='2',
            parent='',
            name='Capacitor',
            legend='C',
            suffix='C',
            object='Object',
            grips='Grips'
        )
    
    def test_list_components(self):
        url = reverse('component-list')
        response = self.client.get(url, format='json')
        print("component response.data:", response.data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["components"]), 2)

class ProjectAPITest(APITestCase):
    def setUp(self):
        # Create user
        self.user = User.objects.create_user(
            username="testuser",
            password="testpassword123"
        )

        # Login and get token
        login_url = reverse("auth_login")
        login_response = self.client.post(login_url, {
            "username": "testuser",
            "password": "testpassword123"
        }, format="json")

        self.access_token = login_response.data["access"]

        # Authenticate client
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}"
        )

        # Create component
        self.component = Component.objects.create(
            s_no="1",
            parent="",
            name="Resistor",
            legend="R",
            suffix="Ω",
            object="Object",
            grips="Grips"
        )

        # Create project
        self.project = Project.objects.create(
            name="Test Project",
            user=self.user
        )

    # -----------------------------
    # LIST PROJECTS
    # -----------------------------
    def test_list_projects(self):
        url = reverse("project-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["projects"]), 1)

    # -----------------------------
    # CREATE PROJECT
    # -----------------------------
    def test_create_project(self):
        url = reverse("project-list")
        data = {
            "name": "New Project"
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Project.objects.count(), 2)
        self.assertEqual(response.data["project"]["name"], "New Project")

    # -----------------------------
    # RETRIEVE PROJECT (NO COMPONENTS)
    # -----------------------------
    class ProjectDetailTests(APITestCase):

        def setUp(self):
        # Create a user and authenticate
            self.user = User.objects.create_user(username="testuser", password="testpass")
            self.client.force_authenticate(user=self.user)

            # Create a project
            self.project = Project.objects.create(
                name="Test Project",
                description="Test description",
                user=self.user
            )

            # Create some components
            self.component1 = Component.objects.create(
                name="Pump",
                s_no="001",
                parent="Fluid",
                legend="P",
                suffix="A",
                object="PumpObject",
                svg=None,
                png=None,
                grips=[]
            )

            self.component2 = Component.objects.create(
                name="Valve",
                s_no="002",
                parent="Fluid",
                legend="V",
                suffix="B",
                object="ValveObject",
                svg=None,
                png=None,
                grips=[]
            )

        # -----------------------------
        # RETRIEVE PROJECT DETAIL
        # -----------------------------
        def test_retrieve_project_detail(self):
            url = reverse("project-detail", args=[self.project.id])
            response = self.client.get(url)

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data["project"]["name"], "Test Project")
            self.assertIn("canvas_state", response.data)
            self.assertEqual(response.data["canvas_state"]["items"], [])
            self.assertEqual(response.data["canvas_state"]["connections"], [])

        # -----------------------------
        # UPDATE PROJECT DETAIL WITH CANVAS ITEMS AND CONNECTIONS
        # -----------------------------
        def test_update_project_detail_with_canvas(self):
            url = reverse("project-detail", args=[self.project.id])

            data = {
                "name": "Updated Project",
                "description": "Updated project description",
                "canvas_state": {
                    "items": [
                        {
                            "id": 1,
                            "component": {"id": self.component1.id},
                            "label": "Pump #1",
                            "x": 100,
                            "y": 150,
                            "width": 50,
                            "height": 50,
                            "rotation": 0,
                            "scaleX": 1,
                            "scaleY": 1,
                            "sequence": 1,
                            "connections": [],
                        },
                        {
                            "id": 2,
                            "component": {"id": self.component2.id},
                            "label": "Valve #1",
                            "x": 300,
                            "y": 150,
                            "width": 50,
                            "height": 50,
                            "rotation": 0,
                            "scaleX": 1,
                            "scaleY": 1,
                            "sequence": 2,
                            "connections": [],
                        }
                    ],
                    "connections": [
                        {
                            "id": 1,
                            "sourceItemId": 1,
                            "sourceGripIndex": 0,
                            "targetItemId": 2,
                            "targetGripIndex": 1,
                            "waypoints": [
                                {"x": 150, "y": 150},
                                {"x": 250, "y": 150}
                            ]
                        }
                    ],
                    "sequence_counter": 3
                }
            }

            response = self.client.patch(url, data, format="json")

            self.assertEqual(response.status_code, status.HTTP_200_OK)

            # -----------------------------
            # Verify Project updated
            # -----------------------------
            self.project.refresh_from_db()
            self.assertEqual(self.project.name, "Updated Project")
            self.assertEqual(self.project.description, "Updated project description")

            # -----------------------------
            # Verify CanvasState created
            # -----------------------------
            self.assertEqual(CanvasState.objects.filter(project=self.project).count(), 2)
            labels = CanvasState.objects.filter(project=self.project).values_list("label", flat=True)
            self.assertIn("Pump #1", labels)
            self.assertIn("Valve #1", labels)

            # -----------------------------
            # Verify Connection created
            # -----------------------------
            self.assertEqual(Connection.objects.filter(sourceItemId__project=self.project).count(), 1)
            conn = Connection.objects.get(sourceItemId__id=1, targetItemId__id=2)
            self.assertEqual(conn.sourceGripIndex, 0)
            self.assertEqual(conn.targetGripIndex, 1)
            self.assertEqual(conn.waypoints, [{"x": 150, "y": 150}, {"x": 250, "y": 150}])

            # -----------------------------
            # Verify response structure
            # -----------------------------
            self.assertIn("project", response.data)
            self.assertIn("canvas_state", response.data)
            self.assertEqual(len(response.data["canvas_state"]["items"]), 2)
            self.assertEqual(len(response.data["canvas_state"]["connections"]), 1)
            self.assertEqual(response.data["canvas_state"]["sequence_counter"], 2)

        # -----------------------------
        # TEST COMPONENT GRIPS JSON FIELD
        # -----------------------------
        def test_component_grips_is_json(self):
            component = Component.objects.create(
                name="Resistor",
                s_no="003",
                parent="Electrical",
                legend="R",
                suffix="C",
                object="ResistorObject",
                svg=None,
                png=None,
                grips=[]
            )
            self.assertEqual(component.grips, [])
    # -----------------------------
    # UNAUTHORIZED ACCESS BLOCKED
    # -----------------------------
    def test_project_requires_auth(self):
        self.client.credentials()  # remove auth

        url = reverse("project-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
